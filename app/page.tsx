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
        rows={8}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text here…"
        style={{ width: "100%", marginTop: 16, padding: 12, fontSize: 16 }}
      />

      <button
        onClick={analyze}
        disabled={loading || input.trim().length < 10}
        style={{ marginTop: 12, padding: "10px 16px", fontSize: 16 }}
      >
        {loading ? "Analyzing…" : "Analyze"}
      </button>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 24 }}>
          <h2>Manipulation Signals</h2>
          <p>
            <b>Score:</b> {result.tactics?.score_0_to_100}/100
          </p>
          <p>
            <b>Flags:</b> {result.tactics?.flags?.join(", ")}
          </p>
          <p>{result.tactics?.explanation}</p>

          <h2 style={{ marginTop: 18 }}>Calm Rebuttal</h2>
          <p>{result.rebuttal?.short}</p>

          <pre style={{ marginTop: 16, padding: 12, background: "#111", color: "#fff" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
