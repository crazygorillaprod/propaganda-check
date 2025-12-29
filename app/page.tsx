"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, TeachingTake, UsageTier } from "@/lib/types";
import { Header } from "@/components/Header";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { ResultTopline } from "@/components/ResultTopline";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Footer } from "@/components/Footer";

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
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const emailGateTitleId = useMemo(() => "email-gate-title", []);
  const emailGateDescriptionId = useMemo(() => "email-gate-description", []);

  const sharedParams = useMemo(() => {
    if (typeof window === "undefined") return { q: "", share: false, autorun: false };
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get("q") || "",
      share: params.get("share") === "1",
      autorun: params.get("autorun") === "1",
    };
  }, []);

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
      // Allow shared links to load without the email gate.
      if (sharedParams.share) {
        setShowEmailGate(false);
      } else {
        setShowEmailGate(true);
      }
    }
  }, [sharedParams.share]);

  // Hydrate input from share link
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sharedParams.q) return;
    setInput(sharedParams.q);
  }, [sharedParams.q]);

  useEffect(() => {
    if (!showEmailGate) return;

    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    const t = window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(t);
  }, [showEmailGate]);

  function closeEmailGate() {
    setShowEmailGate(false);
    setEmailError("");
    setEmailSuccess(null);
    setDevVerifyLink(null);
    const el = lastActiveElementRef.current;
    if (el && typeof el.focus === "function") {
      window.setTimeout(() => el.focus(), 0);
    }
  }

  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeEmailGate();
      return;
    }

    if (e.key !== "Tab") return;
    if (!dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex !== -1);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  }

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
    setEmailSuccess(null);
    setDevVerifyLink(null);

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

          if (process.env.NODE_ENV === "development" && data.verificationToken) {
            const verifyLink = `${window.location.origin}/verify?token=${data.verificationToken}`;
            setDevVerifyLink(verifyLink);
          }

          setEmailSuccess("Check your email for a verification link.");
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
    if (tier === "free" && !userEmail && !sharedParams.share) {
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
        body: JSON.stringify({ input, email: userEmail, cacheOnly: sharedParams.share && !userEmail }),
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

  // Optional autorun for shared links (will hit cache if already analyzed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sharedParams.autorun) return;
    if (!sharedParams.q || sharedParams.q.trim().length < 8) return;
    // If the email gate is open, don't autorun until user closes it.
    if (showEmailGate) return;
    // Avoid re-running if we already have a result.
    if (result) return;
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedParams.autorun, sharedParams.q, showEmailGate]);

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
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={emailGateTitleId}
            aria-describedby={emailGateDescriptionId}
            onKeyDown={trapFocus}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="sr-only" id={emailGateTitleId}>
                Start with 10 free checks/month
              </div>
              <button
                type="button"
                onClick={closeEmailGate}
                className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="text-center">
              <div className="text-4xl">Receipts before opinions</div>
              <h2
                className="mt-3 text-xl font-extrabold tracking-tight text-slate-900"
                id={emailGateTitleId}
              >
                Start with 10 free checks/month
              </h2>
              <p className="mt-2 text-sm text-slate-600" id={emailGateDescriptionId}>
                No credit card required.
              </p>
            </div>

            <div className="mt-5">
              <input
                ref={emailInputRef}
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                placeholder="you@company.com"
                disabled={!!emailSuccess}
                className={`w-full rounded-lg border bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 ${
                  emailError ? "border-red-300" : "border-slate-200"
                }`}
              />
              {emailError ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  {emailError}
                </p>
              ) : null}
              {emailSuccess ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  {emailSuccess}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleEmailSubmit}
              disabled={loading || !!emailSuccess}
              className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending…" : "Start analyzing"}
            </button>

            {devVerifyLink ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-extrabold text-amber-900">Dev mode</div>
                <p className="mt-1 text-xs text-amber-900">
                  Verification link (normally emailed):
                </p>
                <div className="mt-2 break-all rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-900">
                  {devVerifyLink}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={devVerifyLink}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Open verify page
                  </a>
                  <button
                    type="button"
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    onClick={() => navigator.clipboard.writeText(devVerifyLink)}
                  >
                    Copy link
                  </button>
                </div>
              </div>
            ) : null}

            {emailSuccess ? (
              <button
                type="button"
                onClick={closeEmailGate}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
              >
                Continue
              </button>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">
                Free tier includes
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>• 10 fact checks per month</li>
                <li>• Live evidence from trusted sources</li>
                <li>• Civic Breakdown previews</li>
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
            {typeof result?._meta?.remaining_checks === 'number' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Checks remaining this month: <span className="font-semibold">{result._meta.remaining_checks}</span>
                {result._meta.cached ? (
                  <span className="text-slate-500"> • cached result (doesn’t use a check)</span>
                ) : null}
              </div>
            ) : null}
            <ResultTopline result={result} shareInput={input} />
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

      <Footer />
    </main>
  );
}
