import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Terms — Propaganda Buster by BFMbreakdown',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Header />

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">Terms</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            By using this service, you agree that outputs are informational and may be incomplete or incorrect.
            You are responsible for how you use results.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Paid plans renew monthly unless canceled. If you run into billing issues, contact support.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
