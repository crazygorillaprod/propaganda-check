"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

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
        throw new Error((data as any)?.error || (data as any)?.details || text || `Request failed (${res.status})`);
      }

      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function getVerdictColor(verdict: string) {
    switch (verdict) {
      case "Supported": return { bg: "#d1fae5", color: "#065f46" };
      case "Not supported": return { bg: "#fee2e2", color: "#991b1b" };
      case "Mixed": return { bg: "#fef3c7", color: "#92400e" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  }

  function getStanceIcon(stance: string) {
    switch (stance) {
      case "supports": return "✓";
      case "refutes": return "✗";
      case "neutral": return "○";
      default: return "?";
    }
  }

  function getStanceColor(stance: string) {
    switch (stance) {
      case "supports": return "#059669";
      case "refutes": return "#dc2626";
      case "neutral": return "#6b7280";
      default: return "#9ca3af";
    }
  }

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
          
          {/* Article Meta */}
          {result.articleMeta?.url && (
            <div style={{ background: "white", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Source Analysis</div>
              {result.articleMeta.title && (
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{result.articleMeta.title}</h3>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Domain: <strong>{result.articleMeta.domain}</strong></span>
                {result.articleMeta.sourceType && (
                  <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 4 }}>
                    {result.articleMeta.sourceType}
                  </span>
                )}
                {result.articleMeta.publishDate && (
                  <span style={{ color: "#6b7280" }}>Published: {result.articleMeta.publishDate}</span>
                )}
              </div>
            </div>
          )}

          {/* Overall Verifiability */}
          <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Overall Verifiability</h2>
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Score</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: result.overallVerifiability.score > 70 ? "#059669" : result.overallVerifiability.score > 40 ? "#d97706" : "#dc2626" }}>
                  {result.overallVerifiability.score}/100
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Confidence</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#6b7280" }}>
                  {Math.round(result.overallVerifiability.confidence * 100)}%
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Evidence Quality</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{result.overallVerifiability.breakdown.evidenceQuality}%</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Source Credibility</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{result.overallVerifiability.breakdown.sourceCredibility}%</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Claim Checkability</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{result.overallVerifiability.breakdown.claimCheckability}%</div>
              </div>
            </div>
          </div>
          
          {/* Manipulation Tactics */}
          <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Manipulation Signals</h2>
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Score</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: result.tactics?.score_0_to_100 > 70 ? "#059669" : "#dc2626" }}>
                  {result.tactics?.score_0_to_100}/100
                </div>
              </div>
              {result.tactics?.flags?.length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Flags</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {result.tactics.flags.map((f: string) => (
                      <span key={f} style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: 4, fontSize: 13 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#374151", margin: 0 }}>{result.tactics?.explanation}</p>
          </div>

          {/* Claims */}
          {result.claims && result.claims.length > 0 && (
            <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Claims Analysis</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {result.claims.map((claim, idx) => {
                  const { bg, color } = getVerdictColor(claim.verdict);
                  return (
                    <div key={idx} style={{ paddingBottom: 24, borderBottom: idx < result.claims.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 8 }}>
                        <div style={{ background: bg, color, padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {claim.verdict}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111", flex: 1 }}>{claim.text}</div>
                      </div>
                      
                      {/* Claim metadata */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                        <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                          Type: {claim.type}
                        </span>
                        <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                          Checkability: {Math.round(claim.checkability * 100)}%
                        </span>
                        <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                          Confidence: {Math.round(claim.verdictConfidence * 100)}%
                        </span>
                      </div>
                      
                      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, marginLeft: 0 }}>{claim.reasoning}</p>
                      
                      {/* Evidence Summary */}
                      {claim.evidenceSummary && (
                        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6, marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Evidence Summary</div>
                          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                            <span>{claim.evidenceSummary.totalSources} sources</span>
                            <span>{claim.evidenceSummary.uniqueDomains} unique domains</span>
                            <span style={{ color: "#059669" }}>✓ {claim.evidenceSummary.supportingCount} supporting</span>
                            <span style={{ color: "#dc2626" }}>✗ {claim.evidenceSummary.refutingCount} refuting</span>
                            <span>Avg credibility: {Math.round(claim.evidenceSummary.averageCredibility * 100)}%</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Evidence items with scores */}
                      {claim.evidence && claim.evidence.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                            Evidence Sources:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {claim.evidence.slice(0, 4).map((evidence, i) => (
                              <div key={i} style={{ background: "#f9fafb", padding: 10, borderRadius: 6, border: "1px solid #e5e7eb" }}>
                                <div style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 16, color: getStanceColor(evidence.stanceTowardsClaim) }}>
                                    {getStanceIcon(evidence.stanceTowardsClaim)}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <a href={evidence.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: 13, fontWeight: 500 }}>
                                      {evidence.title}
                                    </a>
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{evidence.domain}</div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                                  <span>Relevance: {Math.round(evidence.relevanceScore * 100)}%</span>
                                  <span>Credibility: {Math.round(evidence.credibilityScore * 100)}%</span>
                                  {evidence.age && <span>{evidence.age}</span>}
                                </div>
                                {evidence.keyQuote && (
                                  <div style={{ fontSize: 12, color: "#374151", marginTop: 6, fontStyle: "italic", paddingLeft: 8, borderLeft: "2px solid #d1d5db" }}>
                                    "{evidence.keyQuote}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested searches for this claim */}
                      {claim.suggestedSearches && claim.suggestedSearches.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
                            Suggested searches for this claim:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {claim.suggestedSearches.slice(0, 3).map((q, i) => (
                              <a 
                                key={i} 
                                href={`https://search.brave.com/search?q=${encodeURIComponent(q)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: 4, textDecoration: "none" }}
                              >
                                {q}
                              </a>
                            ))}
                          </div>
                        </div>
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
