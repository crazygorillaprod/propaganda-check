'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

type VerifyStatus = 'verifying' | 'success' | 'error';

type VerifyResponse =
  | { success: true; message: string; email: string }
  | { error: string };

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [raw, setRaw] = useState<VerifyResponse | null>(null);
  const [tab, setTab] = useState<'summary' | 'details'>('summary');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Verify the token
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then((data: VerifyResponse) => {
        setRaw(data);

        if ('success' in data && data.success) {
          setStatus('success');
          setEmail(data.email);
          setMessage(data.message || `Email verified: ${data.email}`);
          
          // Store email in localStorage
          localStorage.setItem('user_email', data.email);
          localStorage.setItem('email_verified', 'true');
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(('error' in data && data.error) || 'Verification failed');
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage('Verification failed: ' + err.message);
      });
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Header />

        <div className="mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            This confirms your account so we can apply your plan and usage limits.
          </p>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className={
                  status === 'success'
                    ? 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900'
                    : status === 'error'
                      ? 'inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-900'
                      : 'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-900'
                }
              >
                {status === 'verifying'
                  ? 'Verifying…'
                  : status === 'success'
                    ? 'Verified'
                    : 'Verification failed'}
              </div>

              {status === 'success' ? (
                <div className="text-xs sm:text-sm text-slate-600">Redirecting to home…</div>
              ) : null}
            </div>

            <div className="text-sm text-slate-700">{message}</div>

            {email ? (
              <div className="text-xs text-slate-500">
                Verified email: <span className="font-semibold text-slate-900">{email}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-2 border-b border-slate-200 p-2">
            <button
              type="button"
              onClick={() => setTab('summary')}
              className={
                tab === 'summary'
                  ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                  : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50'
              }
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setTab('details')}
              className={
                tab === 'details'
                  ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                  : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50'
              }
            >
              Details
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {tab === 'summary' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-extrabold text-slate-900">Next steps</div>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>• Return to the homepage and start analyzing.</li>
                    <li>• If you purchased a plan, your tier syncs automatically.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Go to Homepage
                  </button>
                  <Link
                    href="/pricing"
                    className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            ) : null}

            {tab === 'details' ? (
              <div className="space-y-3">
                <div className="text-sm font-extrabold text-slate-900">Raw response</div>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
          <Header />
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="text-4xl">⏳</div>
            <div className="mt-3 text-sm font-semibold text-slate-700">Loading…</div>
          </div>
          <Footer />
        </div>
      </main>
    }>
      <VerifyContent />
    </Suspense>
  );
}
