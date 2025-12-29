'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PricingPage() {
  const [banner, setBanner] = useState<{ type: 'success' | 'cancel'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      setBanner({ type: 'success', message: 'Payment successful. Your plan is now active.' });

      const email = localStorage.getItem('user_email');
      if (email) {
        fetch(`/api/me?email=${encodeURIComponent(email)}`)
          .then((r) => r.json())
          .then((data) => {
            const nextTier = data?.tier;
            if (typeof nextTier === 'string' && nextTier) {
              localStorage.setItem('user_tier', nextTier);
            }
          })
          .catch(() => {});
      }
    } else if (params.get('canceled') === '1') {
      setBanner({ type: 'cancel', message: 'Checkout canceled.' });
    }
  }, []);

  const startCheckout = async (tier: 'pro' | 'creator' | 'organization') => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
    if (!email) {
      window.location.href = '/';
      return;
    }

    setError(null);

    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tier }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || 'Could not start checkout';
      setError(msg);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <Header />

        {banner ? (
          <div
            className={
              banner.type === 'success'
                ? 'mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900'
                : 'mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900'
            }
          >
            {banner.message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
            {error}
          </div>
        ) : null}

        <div className="mt-10 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Not Getting Embarrassed: Priceless
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-600">
            Evidence-first checks on political claims and power.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-extrabold">Free</h3>
            <div className="mt-3 text-4xl font-extrabold">$0</div>
            <p className="mt-2 text-sm text-slate-600">Try before you commit</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>✓ 10 fact checks/month</li>
              <li>✓ Evidence-based analysis</li>
              <li>✓ Civic Breakdown previews</li>
              <li className="text-slate-400">✗ No exports</li>
            </ul>
            <button
              type="button"
              className="mt-5 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900"
            >
              Current Plan
            </button>
          </section>

          <section className="relative rounded-2xl border-2 border-violet-400 bg-white p-6 shadow-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-extrabold text-white">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-extrabold">Pro (Civic)</h3>
            <div className="mt-3 text-4xl font-extrabold">$25</div>
            <div className="mt-1 text-sm text-slate-600">/month</div>
            <p className="mt-2 text-sm text-slate-600">For commentators & organizers</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>✓ 50 fact checks/month</li>
              <li>✓ Full Civic Breakdowns</li>
              <li>✓ PDF & text exports</li>
              <li>✓ Social media snippets</li>
              <li>✓ Email support</li>
            </ul>
            <button
              type="button"
              onClick={() => startCheckout('pro')}
              className="mt-5 w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-violet-700"
            >
              Upgrade to Pro
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-extrabold">Professional</h3>
            <div className="mt-3 text-4xl font-extrabold">$99</div>
            <div className="mt-1 text-sm text-slate-600">/month</div>
            <p className="mt-2 text-sm text-slate-600">Higher-volume checks + exports</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>✓ 300 fact checks/month</li>
              <li>✓ Rollover unused checks</li>
              <li>✓ Everything in Pro</li>
              <li>✓ Priority support</li>
              <li>✓ Custom templates</li>
            </ul>
            <button
              type="button"
              onClick={() => startCheckout('creator')}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Upgrade to Professional
            </button>
          </section>

          <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <h3 className="text-lg font-extrabold">Organization</h3>
            <div className="mt-3 text-4xl font-extrabold">$500</div>
            <div className="mt-1 text-sm text-slate-300">/month</div>
            <p className="mt-2 text-sm text-slate-200">Teams & advocacy groups</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-100">
              <li>✓ 1,000 fact checks/month</li>
              <li>✓ Up to 10 team seats</li>
              <li>✓ Shared analysis library</li>
              <li>✓ White-label exports</li>
              <li>✓ Dedicated support</li>
            </ul>
            <button
              type="button"
              onClick={() => startCheckout('organization')}
              className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-100"
            >
              Upgrade to Organization
            </button>
          </section>
        </div>

        {/* Who This Is For */}
        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-4xl font-extrabold tracking-tight">Who This Is For</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">🎙️</div>
              <h3 className="mt-3 text-base font-extrabold">Political Commentators</h3>
              <p className="mt-2 text-sm text-slate-600">
                You deal with public claims. One mistake damages credibility for months.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">📝</div>
              <h3 className="mt-3 text-base font-extrabold">Journalists</h3>
              <p className="mt-2 text-sm text-slate-600">
                Fast verification with receipts. Your reputation is your career.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">📢</div>
              <h3 className="mt-3 text-base font-extrabold">Organizers</h3>
              <p className="mt-2 text-sm text-slate-600">
                Train your team. Consistent messaging. Legal protection.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">🎓</div>
              <h3 className="mt-3 text-base font-extrabold">Educators</h3>
              <p className="mt-2 text-sm text-slate-600">
                Teach media literacy with live examples. Show, don't tell.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-center text-2xl sm:text-4xl font-extrabold tracking-tight">Questions</h2>
          <div className="mx-auto mt-10 max-w-2xl space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold">Why not just use Google?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Google shows you results. We show you whether those results support, refute, or provide context for specific claims. Big difference.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold">What happens when I hit my limit?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You can still analyze cached results and export Civic Breakdowns. You just can't pull fresh evidence until next month or you upgrade.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold">Can I cancel anytime?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Yes. No long-term contracts. 14-day money-back guarantee if you're not happy.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold">Do you track my searches?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We cache analysis results to save costs. We never sell data. See our privacy policy for details.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
