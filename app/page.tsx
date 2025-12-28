"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(data?.error || data?.details || text || `Request failed (${res.status})`);
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
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {result.claims.map((claim: any, idx: number) => {
                  const { bg, color } = getVerdictColor(claim.verdict);
                  return (
                    <div key={idx} style={{ paddingBottom: 20, borderBottom: idx < result.claims.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                      <div style={{ display: "flex", alignItems: "start", gap: 12, marginBottom: 8 }}>
                        <div style={{ background: bg, color, padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {claim.verdict}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111", flex: 1 }}>{claim.claim}</div>
                      </div>
                      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12, marginLeft: 0 }}>{claim.reasoning}</p>
                      {claim.citations && claim.citations.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
                            Sources ({claim.domain_count} {claim.domain_count === 1 ? 'domain' : 'domains'}):
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                            {claim.citations.map((cit: any, i: number) => (
                              <li key={i} style={{ fontSize: 13 }}>
                                <a href={cit.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{cit.title}</a>
                              </li>
                            ))}
                          </ul>
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

          {/* Research Guidance */}
          {result.research_guidance && (
            <div style={{ background: "white", padding: 24, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Research Guidance</h2>
              <p style={{ fontSize: 15, marginBottom: 16, color: "#374151" }}>
                <strong style={{ color: result.research_guidance.verifiability_0_to_100 > 80 ? "#059669" : "#dc2626" }}>
                  Verifiability: {result.research_guidance.verifiability_0_to_100}/100
                </strong>
              </p>
              {result.research_guidance.suggested_searches?.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#6b7280" }}>Suggested searches:</div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.research_guidance.suggested_searches.map((q: string, i: number) => (
                      <li key={i} style={{ fontSize: 14 }}>
                        <a href={`https://search.brave.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{q}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Meta info */}
          {result.meta?.excluded_domain && (
            <div style={{ padding: 12, background: "#fef3c7", color: "#92400e", borderRadius: 6, fontSize: 13 }}>
              <strong>Note:</strong> Excluded domain <code>{result.meta.excluded_domain}</code> from search results to avoid circular citations.
            </div>
          )}

        </div>
      )}
    </main>
  );
}
