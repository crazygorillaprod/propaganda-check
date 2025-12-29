import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Contact — Propaganda Buster by BFMbreakdown',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Header />

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">Contact</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            For support, billing, or feedback, email:
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">support@bfmbreakdown.com</p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
