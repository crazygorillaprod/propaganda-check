"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult, TeachingTake, UsageTier } from "@/lib/types";
import { Header } from "@/components/Header";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { ResultTopline } from "@/components/ResultTopline";
import { AnalysisTabs } from "@/components/AnalysisTabs";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [teachingTake, setTeachingTake] = useState<TeachingTake | null>(null);
  const [loadingTeachingTake, setLoadingTeachingTake] = useState(false);
  const [showTeachingTake, setShowTeachingTake] = useState(false);
  const [tier, setTier] = useState<UsageTier>("free");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  // Check for stored email/tier on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmail = localStorage.getItem("user_email");
    const storedTier = localStorage.getItem("user_tier") as UsageTier | null;

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
            localStorage.setItem("user_tier", nextTier);
          }
        })
        .catch(() => {});
    } else {
      setShowEmailGate(true);
    }
  }, []);

  function extractErrorFromJson(value: unknown): string | undefined {
    if (!value || typeof value !== "object") return undefined;
    const obj = value as Record<string, unknown>;
    const error = obj.error;
    const details = obj.details;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof details === "string" && details.trim()) return details;
    return undefined;
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleEmailSubmit() {
    setEmailError("");

    if (!emailInput.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    if (!validateEmail(emailInput)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Send email to backend
    setLoading(true);
    fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Store email locally
          localStorage.setItem("user_email", emailInput);
          setUserEmail(emailInput);
          setShowEmailGate(false);

          // Show verification message
          if (process.env.NODE_ENV === "development" && data.verificationToken) {
            const verifyLink = `${window.location.origin}/verify?token=${data.verificationToken}`;
            // eslint-disable-next-line no-console
            console.log("🔗 Verification link:", verifyLink);
            alert(
              "Check console for verification link (in production, this would be emailed)",
            );
          } else {
            alert("Welcome! Check your email for verification link.");
          }
        } else {
          setEmailError(data.error || "Signup failed");
        }
      })
      .catch((err) => {
        setEmailError("Network error: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function analyze() {
    // Check if email is required
    if (tier === "free" && !userEmail) {
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
        throw new Error(
          extractErrorFromJson(data) || text || `Request failed (${res.status})`,
        );
      }

      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function generateTeachingTake() {
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
      // eslint-disable-next-line no-console
      console.error("Teaching take error:", err);
    } finally {
      setLoadingTeachingTake(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Email Gate Modal */}
      {showEmailGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="text-4xl">Receipts before opinions</div>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">
                Start with 10 free checks/month
              </h2>
              <p className="mt-2 text-sm text-slate-600">No credit card required.</p>
            </div>

            <div className="mt-5">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                placeholder="you@company.com"
                className={`w-full rounded-lg border bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 ${
                  emailError ? "border-red-300" : "border-slate-200"
                }`}
              />
              {emailError ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {emailError}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleEmailSubmit}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending…" : "Start analyzing"}
            </button>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">
                Free tier includes
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>• 10 fact checks per month</li>
                <li>• Live evidence from trusted sources</li>
                <li>• Teaching Take previews</li>
              </ul>
              <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                Upgrade anytime → $25/month for 50 checks + exports
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              We respect your privacy.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Header />

        <div className="mt-6">
          <AnalyzeForm
            value={input}
            onChange={setInput}
            onAnalyze={analyze}
            onClear={() => {
              setInput("");
              setResult(null);
              setError("");
              setTeachingTake(null);
              setShowTeachingTake(false);
            }}
            disabled={input.trim().length < 8}
            loading={loading}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        {loading && !result ? (
          <div className="mt-6 grid gap-3">
            <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-4">
            <ResultTopline result={result} />
            <AnalysisTabs
              input={input}
              result={result}
              tier={tier}
              teachingTake={teachingTake}
              loadingTeachingTake={loadingTeachingTake}
              showTeachingTake={showTeachingTake}
              onGenerateTeachingTake={generateTeachingTake}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
