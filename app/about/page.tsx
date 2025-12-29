import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'About — Propaganda Buster by BFMbreakdown',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Header />

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">About</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Propaganda Buster helps people who speak publicly pressure-test claims with receipts. It breaks an input into claims,
            retrieves sources, and summarizes what appears supported, refuted, or unclear based on available evidence.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            It’s designed for speed and clarity — not as a substitute for professional reporting.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
