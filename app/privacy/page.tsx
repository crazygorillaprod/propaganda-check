import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy — Propaganda Buster by BFMbreakdown',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Header />

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">Privacy</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            We use your email to associate your account tier and usage limits. We do not sell personal information.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            We may cache analysis outputs to reduce costs and improve speed. If you have questions or deletion requests, contact us.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
