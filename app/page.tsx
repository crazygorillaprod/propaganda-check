"use client";

import { useEffect, useState } from "react";
import { sanitizeUrl } from "@/lib/sanitize";
import { AnalysisResult, EvidenceItem, TeachingTake, type UsageTier } from "@/lib/types";
import { TeachingTakeDisplay } from "@/components/TeachingTakeDisplay";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [teachingTake, setTeachingTake] = useState<TeachingTake | null>(null);
  const [loadingTeachingTake, setLoadingTeachingTake] = useState(false);
  const [showTeachingTake, setShowTeachingTake] = useState(false);
  const [tier, setTier] = useState<UsageTier>('free');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  // Check for stored email/tier on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedEmail = localStorage.getItem('user_email');
    const storedTier = localStorage.getItem('user_tier') as UsageTier | null;

    if (storedEmail) {
      setUserEmail(storedEmail);
      if (storedTier) setTier(storedTier);

      // Refresh from server (Stripe/webhook source of truth)
      fetch(`/api/me?email=${encodeURIComponent(storedEmail)}`)
        .then((r) => r.json())
        .then((data) => {
          const nextTier = data?.tier as UsageTier | undefined;
          if (nextTier) {
            setTier(nextTier);
            localStorage.setItem('user_tier', nextTier);
          }
        })
        .catch(() => {});
    } else {
      setShowEmailGate(true);
    }
  }, []);

  function extractErrorFromJson(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    const error = obj.error;
    const details = obj.details;
    if (typeof error === 'string' && error.trim()) return error;
    if (typeof details === 'string' && details.trim()) return details;
    return undefined;
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleEmailSubmit() {
    setEmailError('');
    
    if (!emailInput.trim()) {
      setEmailError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    // Send email to backend
    setLoading(true);
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Store email locally
          localStorage.setItem('user_email', emailInput);
          setUserEmail(emailInput);
          setShowEmailGate(false);
          
          // Show verification message
          if (process.env.NODE_ENV === 'development' && data.verificationToken) {
            // In development, show the verification link
            const verifyLink = `${window.location.origin}/verify?token=${data.verificationToken}`;
            console.log('🔗 Verification link:', verifyLink);
            alert(`Check console for verification link (in production, this would be emailed)`);
          } else {
            alert('Welcome! Check your email for verification link.');
          }
        } else {
          setEmailError(data.error || 'Signup failed');
        }
      })
      .catch(err => {
        setEmailError('Network error: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function analyze() {
    // Check if email is required
    if (tier === 'free' && !userEmail) {
      setShowEmailGate(true);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setTeachingTake(null);
    setShowTeachingTake(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, email: userEmail }),
      });

      const text = await res.text();
      let data: AnalysisResult | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(extractErrorFromJson(data) || text || `Request failed (${res.status})`);
      }

      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function getVerdictColor(verdict: string) {
    switch (verdict) {
      case "Supported": return { bg: "#d1fae5", color: "#065f46" };
      case "Likely supported": return { bg: "#dcfce7", color: "#166534" };
      case "Not supported": return { bg: "#fee2e2", color: "#991b1b" };
      case "Mixed":
      case "Mixed/unclear": return { bg: "#fef3c7", color: "#92400e" };
      case "Appears in provided source (not yet corroborated)": return { bg: "#eff6ff", color: "#1e40af" };
      case "No corroboration found": return { bg: "#f3f4f6", color: "#374151" };
      case "Insufficient evidence": return { bg: "#f3f4f6", color: "#374151" };
      case "Not verified yet": return { bg: "#eff6ff", color: "#1e40af" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  }

  function getVerificationStatus(
    state?: string,
    options?: {
      retrievalReason?: string;
      corroboratingSourceCount?: number;
    },
  ) {
    const corroboratingSourceCount = options?.corroboratingSourceCount ?? 0;
    const retrievalReason = options?.retrievalReason;

    // Defensive: if we somehow ended up with a "with results" state but no sources,
    // force the UI into the non-verified/no-corroboration presentation.
    if (state === 'RAN_WITH_RESULTS' && corroboratingSourceCount === 0) {
      state = 'RAN_NO_RESULTS';
    }

    switch (state) {
      case 'NOT_RUN':
        return {
          label: 'Not verified yet',
          subtitle: retrievalReason || 'Evidence retrieval not run',
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#1e40af',
        };
      case 'RAN_NO_RESULTS':
        return {
          label: 'Not verified (no corroborating sources retrieved)',
          subtitle: retrievalReason || 'Search ran but returned no corroborating sources.',
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#1e40af',
        };
      case 'RAN_WITH_RESULTS':
        return {
          label: 'Evidence retrieved',
          subtitle: 'Claims were checked against retrieved sources.',
          bg: '#f3f4f6',
          border: '#e5e7eb',
          color: '#374151',
        };
      default:
        return {
          label: 'Status unavailable',
          subtitle: '',
          bg: '#f3f4f6',
          border: '#e5e7eb',
          color: '#374151',
        };
    }
  }

  function getLanguageRiskPresentation(score?: number) {
    // Rule B: never use red for language risk.
    // Rule A: hide numeric score unless meaningfully elevated (>= 65).
    if (typeof score !== 'number') {
      return {
        label: 'Not assessed',
        showNumeric: false,
        badge: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
        tone: 'neutral' as const,
      };
    }

    if (score >= 65) {
      return {
        label: 'Elevated language framing risk',
        showNumeric: true,
        badge: { bg: '#fef3c7', color: '#78350f', border: '#f59e0b' },
        tone: 'elevated' as const,
      };
    }

    if (score >= 40) {
      return {
        label: 'Moderate language framing risk',
        showNumeric: false,
        badge: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
        tone: 'moderate' as const,
      };
    }

    return {
      label: 'No significant language risk detected',
      showNumeric: false,
      badge: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
      tone: 'low' as const,
    };
  }

  function getVerificationSummaryText(score?: number) {
    if (typeof score !== 'number') return '';
    if (score >= 70) return 'Strong support from available sources.';
    if (score >= 40) return 'Moderate support from available sources.';
    return 'Limited support from available sources.';
  }

  const overall = result ? (result.overall_score ?? result.overallVerifiability) : null;
  const retrievalState: string | undefined = overall?.retrieval_state
    ?? (overall?.status === 'NOT_RUN'
      ? 'NOT_RUN'
      : overall?.status === 'NO_EVIDENCE_FOUND'
        ? 'RAN_NO_RESULTS'
        : overall?.status === 'EVIDENCE_FOUND'
          ? 'RAN_WITH_RESULTS'
          : undefined);
  const retrievalReason: string | undefined = overall?.message ?? overall?.retrieval_reason;
  const corroboratingSourceCount = result?.claims?.reduce((sum, c) => {
    const corroboration = c.evidence.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');
    return sum + corroboration.length;
  }, 0) ?? 0;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, position: 'relative' }}>
      {/* Email Gate Modal */}
      {showEmailGate && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ 
            background: 'white', 
            padding: 40, 
            borderRadius: 16, 
            maxWidth: 480, 
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Receipts Before Opinions</h2>
              <p style={{ color: '#6b7280', fontSize: 15 }}>
                Start fact-checking with 10 free checks per month. No credit card required.
              </p>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                placeholder="your@email.com"
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  fontSize: 15, 
                  border: emailError ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none'
                }}
              />
              {emailError && (
                <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{emailError}</p>
              )}
            </div>
            
            <button
              onClick={handleEmailSubmit}
              style={{ 
                width: '100%',
                padding: '14px 24px', 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              Start Analyzing
            </button>
            
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280' }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: '#374151' }}>Free tier includes:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>10 fact checks per month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Live evidence from trusted sources</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#10b981' }}>✓</span>
                <span>Teaching Take previews</span>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
                Upgrade anytime → $25/month for 50 checks + full exports
              </div>
            </div>
            
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16, textAlign: 'center' }}>
              We respect your privacy. No spam, unsubscribe anytime.
            </p>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 32, fontWeight: 800 }}>
        Propaganda Buster{' '}
        <span style={{ fontSize: 14, fontWeight: 800, color: '#6b7280' }}>by BFMbreakdown</span>
      </h1>

      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <a
          href="/demo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 800,
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: 'white',
            color: '#111827',
            textDecoration: 'none',
          }}
        >
          Buyer demo →
        </a>
      </div>

      <p style={{ marginTop: 8, color: "#374151", fontSize: 17, fontWeight: 500 }}>
        Evidence-first analysis for people who speak publicly.
      </p>
      <p style={{ marginTop: 4, color: "#6b7280", fontSize: 14 }}>
        Receipts before opinions. Think before you amplify.
      </p>

      <textarea
        rows={5}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text or URL here..."
        style={{ width: "100%", marginTop: 16, padding: 14, fontSize: 15, borderRadius: 6, border: "1px solid #d1d5db" }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={analyze}
          disabled={loading || input.trim().length < 8}
          style={{ padding: "12px 20px", fontSize: 15, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        <button
          onClick={() => { setInput(''); setResult(null); setError(''); }}
          style={{ padding: "12px 16px", fontSize: 14, background: "white", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {error && <div style={{ marginTop: 16, padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 6 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Power-user toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDetails((v) => !v)}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                background: showDetails ? '#eff6ff' : 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {showDetails ? 'Hide analysis details' : 'Show analysis details'}
            </button>
          </div>
          
          {/* Article Meta */}
          {(result.article_meta?.canonical_url || result.article_meta?.url) && (
            <div style={{ background: "#f9fafb", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Source Analysis</div>
              {result.article_meta.title && (
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{result.article_meta.title}</h3>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
                <span style={{ color: "#6b7280" }}>
                  Publisher (wrapper): <strong>{result.article_meta.publisher_wrapper || result.article_meta.publisher || result.article_meta.domain}</strong>
                </span>
                {result.article_meta.publisher_original && (
                  <span style={{ color: "#6b7280" }}>
                    Publisher (original): <strong>{result.article_meta.publisher_original}</strong>
                  </span>
                )}
                {result.article_meta.canonical_url && (
                  <span style={{ color: "#6b7280" }}>
                    Canonical URL:{" "}
                    <a href={result.article_meta.canonical_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                      {sanitizeUrl(String(result.article_meta.canonical_url))}
                    </a>
                  </span>
                )}
                {result.article_meta.sourceType && result.article_meta.sourceType !== 'unknown' && (
                  <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 4 }}>
                    {result.article_meta.sourceType}
                  </span>
                )}
                {(result.article_meta.published_at || result.article_meta.publishDate) && (
                  <span style={{ color: "#6b7280" }}>
                    Published: {result.article_meta.published_at || result.article_meta.publishDate}
                  </span>
                )}
                {result.article_meta.author && (
                  <span style={{ color: "#6b7280" }}>Author: {result.article_meta.author}</span>
                )}
              </div>
            </div>
          )}

          {/* Overall Verifiability */}

          {/* Status Banner */}
          {(() => {
            const status = getVerificationStatus(retrievalState, { retrievalReason, corroboratingSourceCount });
            return (
              <div style={{ padding: 14, background: status.bg, border: `1px solid ${status.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: status.color, fontWeight: 700, marginBottom: 2 }}>
                  Verification Status: {status.label}
                </div>
                {status.subtitle && (
                  <div style={{ fontSize: 13, color: status.color, opacity: 0.9 }}>
                    {status.subtitle}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Verification + Language Risk */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Verification card */}
            <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', flex: '1 1 380px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Verification</h2>
              {(() => {
                const score = overall?.score;
                const confidence = overall?.confidence;

                // IMPORTANT: never show numeric verification numbers when no corroborating sources were retrieved.
                const showNumbers =
                  corroboratingSourceCount > 0 &&
                  retrievalState === 'RAN_WITH_RESULTS' &&
                  typeof score === 'number' &&
                  typeof confidence === 'number';

                const summary = showNumbers ? getVerificationSummaryText(score) : '';

                return (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Verification score</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: showNumbers ? (score > 70 ? '#059669' : score > 40 ? '#d97706' : '#374151') : '#1e40af' }}>
                        {showNumbers ? `${score}/100` : 'Status: Not verified yet'}
                      </div>
                      {showNumbers && (
                        <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
                          {summary}
                          {typeof confidence === 'number' && (
                            <span style={{ color: '#6b7280' }}>{` (confidence ${Math.round(confidence * 100)}%)`}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Language risk card */}
            <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', flex: '1 1 380px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Language Risk</h2>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                Analyzes wording and framing — not whether a claim is true or false.
              </div>
              {(() => {
                const score = result.tactics?.score_0_to_100;
                const risk = getLanguageRiskPresentation(typeof score === 'number' ? score : undefined);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span
                        style={{ background: risk.badge.bg, color: risk.badge.color, border: `1px solid ${risk.badge.border}`, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                        title={'This reflects language style, not factual accuracy.'}
                      >
                        {risk.label}
                      </span>
                      {showDetails && typeof score === 'number' && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {`Score: ${score}/100`}
                        </span>
                      )}
                    </div>

                    {showDetails && result.tactics?.flags?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Indicators</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {result.tactics.flags.map((f: string) => (
                            <span key={f} style={{ background: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: 999, fontSize: 12, border: '1px solid #e5e7eb' }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {showDetails && (
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', margin: 0 }}>
                        {result.tactics?.explanation}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Claims */}
          {result.claims && result.claims.length > 0 && (
            <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Claims Analysis</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {result.claims.map((claim, idx) => {
                  const overallNotRun = retrievalState === 'NOT_RUN';
                  const verdictLabel = overallNotRun ? 'Not verified yet' : claim.verdict;
                  const { bg, color } = getVerdictColor(verdictLabel);
                  return (
                    <div key={idx} style={{ paddingBottom: 24, borderBottom: idx < result.claims.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 8 }}>
                        <div style={{ background: bg, color, padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {verdictLabel}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111", flex: 1 }}>{claim.text}</div>
                      </div>

                      {/* Why (one sentence only) */}
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                        {(() => {
                          const why = (overallNotRun
                            ? 'Evidence retrieval not run for this analysis.'
                            : (claim.evidenceSummary?.totalSources || 0) === 0
                              ? 'No external corroboration was retrieved for this claim yet.'
                              : claim.reasoning
                          ) || '';
                          const oneSentence = why.split(/(?<=[.!?])\s+/).filter(Boolean)[0] || why;
                          return oneSentence;
                        })()}
                      </div>

                      {/* Optional technical claim details */}
                      {showDetails && (
                        <div style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 12, flexWrap: "wrap" }}>
                          <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                            Type: {claim.type}
                          </span>
                          <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                            Checkability: {Math.round(claim.checkability * 100)}%
                          </span>
                          <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                            Verdict confidence: {overallNotRun ? 'N/A' : `${Math.round(claim.verdictConfidence * 100)}%`}
                          </span>
                        </div>
                      )}
                      
                      {/* Attribution snippet if present */}
                      {claim.attribution_snippet && (
                        <div style={{ background: "#fffbeb", padding: 10, borderRadius: 6, marginBottom: 12, border: "1px solid #fbbf24" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
                            Attribution Context:
                          </div>
                          <div style={{ fontSize: 12, color: "#78350f", fontStyle: "italic" }}>
                            {claim.attribution_snippet}
                          </div>
                        </div>
                      )}
                      

                      {/* Evidence (collapsed by default) */}
                      {!overallNotRun && (
                        <details style={{ background: "#f9fafb", padding: 12, borderRadius: 6, marginBottom: 12, border: "1px solid #e5e7eb" }}>
                          <summary style={{ fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                            {(() => {
                              const all = claim.evidence || [];
                              const corroborationEvidence = all.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');
                              const corroborationCount = claim.evidenceSummary?.totalSources ?? corroborationEvidence.length;
                              const outlets = claim.evidenceSummary?.uniqueDomains ?? new Set(
                                corroborationEvidence
                                  .map((e) => (e.domain || e.publisher || '').toString())
                                  .filter(Boolean),
                              ).size;
                              if (corroborationCount === 0) return 'Evidence: not yet corroborated (expand)';
                              return `Evidence: ${corroborationCount} source${corroborationCount === 1 ? '' : 's'} across ${outlets} outlet${outlets === 1 ? '' : 's'} (expand)`;
                            })()}
                          </summary>
                          {(() => {
                            const all = claim.evidence || [];
                            const inputEvidence = all.filter((e) => (e.role ?? 'CORROBORATION') === 'INPUT');
                            const corroborationEvidence = all.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');

                            // Cluster by stance (reduces visual duplication).
                            const buckets: Record<'support' | 'refute' | 'context' | 'unclear', EvidenceItem[]> = { support: [], refute: [], context: [], unclear: [] };
                            for (const e of corroborationEvidence) {
                              const raw = (e.stance ?? 'unclear').toLowerCase();
                              const stance = (raw === 'supports' ? 'support' : raw === 'refutes' ? 'refute' : raw) as EvidenceItem['stance'];
                              if (stance === 'support' || stance === 'refute' || stance === 'context' || stance === 'unclear') buckets[stance].push(e);
                              else buckets.unclear.push(e);
                            }

                            const stanceOrder: Array<{ key: keyof typeof buckets; label: string }> = [
                              { key: 'support', label: 'Supporting' },
                              { key: 'refute', label: 'Refuting' },
                              { key: 'context', label: 'Context' },
                              { key: 'unclear', label: 'Unclear' },
                            ];

                            const getOutletList = (items: EvidenceItem[]) => {
                              const names = Array.from(new Set(items.map((x) => (x.publisher || x.domain || '').toString()).filter(Boolean)));
                              return names;
                            };

                            const pickRepresentativeQuote = (items: EvidenceItem[]) => {
                              const sorted = [...items].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
                              const top = sorted[0];
                              if (!top) return '';
                              return (top.keyQuote || top.snippet || '').toString();
                            };

                            return (
                              <div style={{ marginTop: 10 }}>
                                {inputEvidence.length > 0 && (
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Provided source</div>
                                    {inputEvidence.slice(0, 1).map((e, i) => (
                                      <div key={`input-${i}`} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 10 }}>
                                        <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 13, fontWeight: 500 }}>
                                          {e.title || e.url}
                                        </a>
                                        <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>{e.publisher || e.domain}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {stanceOrder.map(({ key, label }) => {
                                  const items = buckets[key];
                                  if (!items || items.length === 0) return null;

                                  const outlets = getOutletList(items);
                                  const quote = pickRepresentativeQuote(items);

                                  return (
                                    <div key={key} style={{ marginBottom: 12 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                                        {label} evidence cluster ({outlets.length} outlet{outlets.length === 1 ? '' : 's'})
                                      </div>
                                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                        {outlets.slice(0, 8).join(', ')}{outlets.length > 8 ? '…' : ''}
                                      </div>
                                      {quote && (
                                        <div style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', paddingLeft: 10, borderLeft: '2px solid #d1d5db', marginBottom: 8 }}>
                                          “{quote}”
                                        </div>
                                      )}

                                      <details style={{ marginTop: 6 }}>
                                        <summary style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>
                                          View sources
                                        </summary>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                          {items.slice(0, 6).map((e, i) => (
                                            <div key={`${key}-${i}`} style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                              <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 13, fontWeight: 500 }}>
                                                {e.title}
                                              </a>
                                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                {e.publisher || e.domain}
                                                {(e.published_at || e.age) && ` • ${e.published_at || e.age}`}
                                              </div>
                                              {showDetails && (
                                                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280', marginTop: 6, flexWrap: 'wrap' }}>
                                                  {typeof e.confidence === 'number' && <span>Confidence: {Math.round(e.confidence * 100)}%</span>}
                                                  {typeof e.relevanceScore === 'number' && <span>Relevance: {Math.round(e.relevanceScore * 100)}%</span>}
                                                  {typeof e.credibilityScore === 'number' && <span>Credibility: {Math.round(e.credibilityScore * 100)}%</span>}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </details>
                      )}
                      
                      {/* Suggested searches for this claim */}
                      {!overallNotRun && claim.suggestedSearches && claim.suggestedSearches.length > 0 && (
                        <details style={{ background: "#f9fafb", padding: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}>
                          <summary style={{ fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                            Suggested searches ({claim.suggestedSearches.length})
                          </summary>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                            {claim.suggestedSearches.slice(0, 3).map((q, i) => (
                              <a 
                                key={i} 
                                href={`https://search.brave.com/search?q=${encodeURIComponent(q)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", padding: "6px 12px", borderRadius: 4, textDecoration: "none", border: "1px solid #bfdbfe" }}
                              >
                                {q}
                              </a>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rebuttal */}
          {result.rebuttal?.short && (
            <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Calm Rebuttal</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#374151", margin: 0 }}>{result.rebuttal.short}</p>
            </div>
          )}

        </div>
      )}

      {/* Teaching Take Section */}
      {result && !showTeachingTake && (
        <div style={{ marginTop: 24, padding: 24, background: 'linear-gradient(to right, #faf5ff, #eff6ff)', border: '1px solid #c4b5fd', borderRadius: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            📚 {tier === 'free' ? 'Never Spread Misinformation Again' : 'Get Your Teaching Take'}
          </h3>
          <p style={{ color: '#374151', marginBottom: 16, fontSize: 14 }}>
            {tier === 'free' 
              ? 'See how Pro users get instant rebuttal scripts, talk tracks, and exportable resources. Preview only—upgrade to unlock.'
              : 'Generate a comprehensive Teaching Take with rebuttals, talk tracks, and action plans.'}
          </p>
          <button
            onClick={async () => {
              if (!result) return;
              setLoadingTeachingTake(true);
              try {
                const res = await fetch("/api/teaching-take", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ analysisResult: result }),
                });
                const json = await res.json();
                if (res.ok) {
                  setTeachingTake(json);
                  setShowTeachingTake(true);
                }
              } catch (err) {
                console.error('Teaching take error:', err);
              } finally {
                setLoadingTeachingTake(false);
              }
            }}
            disabled={loadingTeachingTake}
            style={{ 
              padding: '12px 24px', 
              background: '#9333ea', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontSize: 15,
              fontWeight: 500,
              cursor: loadingTeachingTake ? 'not-allowed' : 'pointer',
              opacity: loadingTeachingTake ? 0.6 : 1
            }}
          >
            {loadingTeachingTake ? "Generating..." : tier === 'free' ? "Preview Teaching Take" : "Generate Teaching Take"}
          </button>
        </div>
      )}

      {showTeachingTake && teachingTake && (
        <div style={{ marginTop: 24 }}>
          <TeachingTakeDisplay 
            teachingTake={teachingTake}
            topic={input}
            isLocked={tier === 'free'}
          />
        </div>
      )}
    </main>
  );
}
