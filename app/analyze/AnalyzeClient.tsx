"use client"

import { useEffect, useState } from "react"
import { TeachingTakeDisplay } from "@/components/TeachingTakeDisplay"
import type { AnalysisResult, TeachingTake, UsageTier } from "@/lib/types"

type Result = AnalysisResult & {
  error?: string
  _meta?: {
    cached?: boolean
    cost?: number
    cache_saved?: number
    processing_time_ms?: number
    remaining_checks?: number
  }
}

export default function AnalyzeClient() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teachingTake, setTeachingTake] = useState<TeachingTake | null>(null)
  const [loadingTeachingTake, setLoadingTeachingTake] = useState(false)
  const [showTeachingTake, setShowTeachingTake] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [tier, setTier] = useState<UsageTier>("free")

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedEmail = localStorage.getItem('user_email')
    const storedTier = localStorage.getItem('user_tier') as UsageTier | null

    if (storedEmail) {
      setUserEmail(storedEmail)
      if (storedTier) setTier(storedTier)

      fetch(`/api/me?email=${encodeURIComponent(storedEmail)}`)
        .then((r) => r.json())
        .then((data) => {
          const nextTier = data?.tier as UsageTier | undefined
          if (nextTier) {
            setTier(nextTier)
            localStorage.setItem('user_tier', nextTier)
          }
        })
        .catch(() => {})
    }
  }, [])

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setTeachingTake(null)
    setShowTeachingTake(false)

    if (input.trim().length < 10) {
      setError("Please provide at least 10 characters to analyze.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input,
          email: userEmail,
          tier
        }),
      })

      const json = await res.json()
      
      if (!res.ok) {
        if (res.status === 429) {
          // Quota exceeded
          setError(`⚠️ ${json.message}\n\nRemaining: ${json.remaining}/${json.total_available}`)
        } else {
          setError(json?.error || "Unknown error from server")
        }
      } else {
        setResult(json)
        
        // Show cache/cost info
        if (json._meta) {
          console.log('Analysis metadata:', {
            cached: json._meta.cached,
            cost: json._meta.cost,
            remaining: json._meta.remaining_checks,
            processing_time: json._meta.processing_time_ms
          })
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateTeachingTake() {
    if (!result) return

    setLoadingTeachingTake(true)
    setError(null)

    try {
      const res = await fetch("/api/teaching-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisResult: result }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error || "Failed to generate teaching take")
      } else {
        setTeachingTake(json)
        setShowTeachingTake(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Teaching take error: ${message}`)
    } finally {
      setLoadingTeachingTake(false)
    }
  }

  // Export functionality now handled by TeachingTakeDisplay component

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyze Content</h1>
        <p className="text-gray-600">
          Evidence-first checks on political claims and power
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border">
        <label className="block">
          <div className="mb-2 font-semibold text-gray-900">Text or URL to analyze</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Paste an article URL, excerpt, or social media post here..."
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60 hover:bg-blue-700 font-medium"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
          <button
            type="button"
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            onClick={() => {
              setInput("")
              setResult(null)
              setTeachingTake(null)
              setShowTeachingTake(false)
            }}
            disabled={loading}
          >
            Clear
          </button>
        </div>
        
        {result?._meta && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {result._meta.cached ? (
              <span>✓ Retrieved from cache (saved ${result._meta.cache_saved?.toFixed(3)})</span>
            ) : (
              <span>
                ✓ Analysis complete • Cost: ${result._meta.cost?.toFixed(3)} • 
                {result._meta.remaining_checks !== undefined && 
                  ` ${result._meta.remaining_checks} checks remaining`}
              </span>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
          <strong>Error:</strong>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          {/* Teaching Take CTA - Show for all users */}
          {!showTeachingTake && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                📚 {tier === 'free' ? 'See what Pro users get' : 'Want a deeper analysis?'}
              </h3>
              <p className="text-gray-700 mb-4">
                {tier === 'free' 
                  ? 'Preview a Civic Breakdown with a plain-language summary, receipts-based response, and an action plan you can share. (Preview only - Upgrade to unlock full access)'
                  : 'Generate a Civic Breakdown with a plain-language summary, receipts-based response, and an action plan you can share.'}
              </p>
              <button
                onClick={handleGenerateTeachingTake}
                disabled={loadingTeachingTake}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60"
              >
                {loadingTeachingTake ? "Generating..." : tier === 'free' ? "Preview Civic Breakdown" : "Generate Civic Breakdown"}
              </button>
            </div>
          )}

          {/* Teaching Take Display */}
          {showTeachingTake && teachingTake && (
            <div className="mt-6">
              <TeachingTakeDisplay 
                teachingTake={teachingTake}
                topic={input}
                isLocked={tier === 'free'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
