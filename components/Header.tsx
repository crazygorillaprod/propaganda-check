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
            Evidence-first analysis for people who speak publicly.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Receipts before opinions. Think before you amplify.</p>
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
