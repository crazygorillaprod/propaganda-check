"use client"

import { useState } from "react"

type Result = {
  tactics?: {
    score_0_to_100?: number
    flags?: string[]
    explanation?: string
  }
  rebuttal?: { short?: string }
  error?: string
}

export default function AnalyzeClient() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (input.trim().length < 10) {
      setError("Please provide at least 10 characters to analyze.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || "Unknown error from server")
      } else {
        setResult(json)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleAnalyze} className="space-y-4">
        <label className="block">
          <div className="mb-2 font-semibold">Text to analyze</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="w-full p-2 border rounded"
            placeholder="Paste an article excerpt or social post here"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <button
            type="button"
            className="px-4 py-2 border rounded"
            onClick={() => setInput("")}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </form>

      {error && <div className="mt-4 text-red-600">Error: {error}</div>}

      {result && (
        <div className="mt-6 bg-gray-50 p-4 rounded border">
          <h3 className="font-semibold">Analysis</h3>
          <div className="mt-2">
            <strong>Score:</strong> {result.tactics?.score_0_to_100 ?? "—"}
          </div>
          <div className="mt-2">
            <strong>Flags:</strong> {result.tactics?.flags?.join(', ') ?? 'None'}
          </div>
          <div className="mt-2">
            <strong>Explanation:</strong>
            <div className="whitespace-pre-wrap mt-1">{result.tactics?.explanation ?? '—'}</div>
          </div>
          <div className="mt-2">
            <strong>Rebuttal (short):</strong>
            <div className="mt-1">{result.rebuttal?.short ?? '-'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
