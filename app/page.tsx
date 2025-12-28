"use client";

import { useState } from "react";
import { sanitizeUrl } from "@/lib/sanitize";
import { AnalysisResult, EvidenceItem } from "@/lib/types";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  function extractErrorFromJson(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    const error = obj.error;
    const details = obj.details;
    if (typeof error === 'string' && error.trim()) return error;
    if (typeof details === 'string' && details.trim()) return details;
    return undefined;
  }

  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
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
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>Propaganda Check</h1>

      <p style={{ marginTop: 8, color: "#6b7280", fontSize: 15 }}>
        Paste a claim, article URL, or headline. Get evidence-based analysis with claim verification.
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
    </main>
  );
}
