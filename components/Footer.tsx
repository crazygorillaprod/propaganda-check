import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-14 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-900">
            Propaganda Buster <span className="font-extrabold text-slate-500">by BFMbreakdown</span>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-slate-700">
            <Link href="/about" className="hover:text-slate-900">
              About
            </Link>
            <Link href="/pricing" className="hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
              Contact
            </Link>
          </nav>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          This tool provides evidence-first analysis to support responsible communication. It does not provide legal advice,
          medical advice, or guarantees of factual correctness.
        </p>
      </div>
    </footer>
  );
}
