'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Propaganda Buster{' '}
            <span className="text-xs sm:text-sm font-extrabold text-slate-500">by BFMbreakdown</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-700">
            Check the claims made by those in power.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            We provide evidence-first analysis, clear sourcing, and plain-language explanations so the public can understand what’s true, what’s unclear, and what’s spin — and respond responsibly.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Our goal is to strengthen democracy by promoting transparency, accountability, and informed public discussion, without telling people what to think.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
          >
            Buyer demo →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  );
}
