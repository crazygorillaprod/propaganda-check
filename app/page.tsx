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
        <section style={{ marginTop: 24 }}>
          <h2>Manipulation Signals</h2>
          <p>
            <b>Score:</b> {result.tactics?.score_0_to_100}/100
          </p>
          <p>
            <b>Flags:</b> {result.tactics?.flags?.join(", ") || 'None'}
          </p>
          <p>{result.tactics?.explanation}</p>

          <h2 style={{ marginTop: 18 }}>Calm Rebuttal</h2>
          <p>{result.rebuttal?.short}</p>

          <h2 style={{ marginTop: 18 }}>Sources</h2>
          {result.sources && result.sources.length ? (
            <ul>
              {result.sources.map((s: any, i: number) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                  ) : (
                    <span>{s.title || s.snippet || 'Unnamed source'}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ opacity: 0.8 }}>No explicit sources were found on the page. Consider searching official sources.</p>
          )}

          <h3 style={{ marginTop: 12 }}>Research guidance</h3>
          <p>
            {result.research_needed ? (
              <b>This content should be researched further (verifiability {result.verifiability_score}/100).</b>
            ) : (
              <b>Content appears highly verifiable (verifiability {result.verifiability_score}/100).</b>
            )}
          </p>

          <details style={{ marginTop: 12 }}>
            <summary>Show raw response</summary>
            <pre style={{ marginTop: 12, padding: 12, background: "#111", color: "#fff" }}>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}
