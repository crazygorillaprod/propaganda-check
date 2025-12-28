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

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>Propaganda Check</h1>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Paste a claim, headline, or paragraph. Get manipulation signals and a calm rebuttal.
      </p>

      <textarea
        rows={6}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text or a URL here… (text or url)"
        style={{ width: "100%", marginTop: 16, padding: 12, fontSize: 16 }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={analyze}
          disabled={loading || input.trim().length < 10}
          style={{ padding: "10px 16px", fontSize: 16 }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        <button
          onClick={() => { setInput(''); setResult(null); setError(''); }}
          style={{ padding: "10px 12px", fontSize: 14 }}
        >
          Clear
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 32, background: '#f9fafb', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 6, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#111' }}>Manipulation Signals</h2>
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Score</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{result.tactics?.score_0_to_100}/100</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Flags</div>
                <div style={{ fontSize: 16 }}>{result.tactics?.flags?.length ? result.tactics.flags.map((f: string) => (
                  <span key={f} style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 4, marginRight: 6, fontSize: 13 }}>{f}</span>
                )) : <span style={{ color: '#9ca3af' }}>None</span>}</div>
              </div>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: '#374151' }}>{result.tactics?.explanation}</div>
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 6, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#111' }}>Calm Rebuttal</h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#374151', margin: 0 }}>{result.rebuttal?.short}</p>
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 6, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#111' }}>Sources</h2>
            {result.sources && result.sources.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {result.sources.map((s: any, i: number) => (
                  <div key={i} style={{ paddingBottom: 16, borderBottom: i < result.sources.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    {s.url ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 600, color: '#2563eb' }}>{s.title || s.url}</a>
                          <span style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>[{s.origin||'unknown'}]</span>
                          <span>
                            {s.stance === 'supports' ? <small style={{ background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>SUPPORTS</small> : s.stance === 'refutes' ? <small style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>REFUTES</small> : s.stance === 'neutral' ? <small style={{ background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>NEUTRAL</small> : <small style={{ background: '#fff7ed', color: '#92400e', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>UNKNOWN</small>}
                          </span>
                          {s.confidence ? <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>({s.confidence}%)</span> : null}
                        </div>
                        {s.snippet && <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, paddingLeft: 0 }}>{s.snippet}</div>}
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: 15 }}>{s.title || s.snippet || 'Unnamed source'}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>[{(s.origin||'unknown').toUpperCase()}]</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', margin: 0 }}>No explicit sources were found.</p>
            )}
          </div>

          <div style={{ background: 'white', padding: 20, borderRadius: 6 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#111' }}>Research Guidance</h3>
            <p style={{ fontSize: 15, marginBottom: 16, color: '#374151' }}>
              {result.research_needed ? (
                <span><strong style={{ color: '#dc2626' }}>⚠ Research recommended</strong> — verifiability score: {result.verifiability_score}/100</span>
              ) : (
                <span><strong style={{ color: '#059669' }}>✓ Highly verifiable</strong> — verifiability score: {result.verifiability_score}/100</span>
              )}
            </p>

            {result.suggested_searches && result.suggested_searches.length ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#6b7280' }}>Suggested searches:</div>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.suggested_searches.map((q: string, i: number) => (
                    <li key={i} style={{ fontSize: 14 }}>
                      <a href={`https://search.brave.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{q}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 16, padding: 12, fontSize: 13, color: '#6b7280', background: '#fef3c7', borderRadius: 4 }}>
            {result.redactions && result.redactions.length ? (
              <p style={{ margin: 0 }}><strong>Note:</strong> Some content was redacted for safety.</p>
            ) : (
              <p style={{ margin: 0 }}>Analysis complete. All content displayed.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
