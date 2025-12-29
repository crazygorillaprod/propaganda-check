'use client';

import { useEffect, useState } from 'react';

export default function PricingPage() {
  const [banner, setBanner] = useState<{ type: 'success' | 'cancel'; message: string } | null>(null);

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

    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tier }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || 'Could not start checkout';
      alert(msg);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f9fafb, #ffffff)' }}>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 16px' }}>
        {banner && (
          <div
            style={{
              marginBottom: 24,
              padding: 12,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: banner.type === 'success' ? '#ecfdf5' : '#fffbeb',
              color: '#374151',
              fontWeight: 600,
            }}
          >
            {banner.message}
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
            Not Getting Embarrassed: Priceless
          </h1>
          <p style={{ fontSize: 20, color: '#6b7280', maxWidth: 600, margin: '0 auto' }}>
            Evidence-first analysis for people who speak publicly.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 80 }}>
          {/* Free */}
          <div style={{ background: 'white', padding: 32, borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Free</h3>
            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>$0</div>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Try before you commit</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, fontSize: 15, lineHeight: 2 }}>
              <li>✓ 10 fact checks/month</li>
              <li>✓ Evidence-based analysis</li>
              <li>✓ Teaching Take previews</li>
              <li style={{ color: '#9ca3af' }}>✗ No exports</li>
            </ul>
            <button style={{ width: '100%', padding: '12px 24px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Current Plan
            </button>
          </div>

          {/* Pro */}
          <div style={{ background: 'white', padding: 32, borderRadius: 16, border: '2px solid #8b5cf6', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#8b5cf6', color: 'white', padding: '4px 16px', borderRadius: 16, fontSize: 13, fontWeight: 600 }}>
              MOST POPULAR
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Pro (Civic)</h3>
            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 4 }}>$25</div>
            <div style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>/month</div>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>For commentators & organizers</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, fontSize: 15, lineHeight: 2 }}>
              <li>✓ 50 fact checks/month</li>
              <li>✓ Full Teaching Takes</li>
              <li>✓ PDF & text exports</li>
              <li>✓ Social media snippets</li>
              <li>✓ Email support</li>
            </ul>
            <button
              onClick={() => startCheckout('pro')}
              style={{ width: '100%', padding: '14px 24px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Creator */}
          <div style={{ background: 'white', padding: 32, borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Creator</h3>
            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 4 }}>$99</div>
            <div style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>/month</div>
            <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Full Spectrum publishing</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, fontSize: 15, lineHeight: 2 }}>
              <li>✓ 300 fact checks/month</li>
              <li>✓ Rollover unused checks</li>
              <li>✓ Everything in Pro</li>
              <li>✓ Priority support</li>
              <li>✓ Custom templates</li>
            </ul>
            <button
              onClick={() => startCheckout('creator')}
              style={{ width: '100%', padding: '14px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}
            >
              Upgrade to Creator
            </button>
          </div>

          {/* Organization */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 32, borderRadius: 16, color: 'white' }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Organization</h3>
            <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 4 }}>$500</div>
            <div style={{ opacity: 0.9, marginBottom: 16, fontSize: 14 }}>/month</div>
            <p style={{ opacity: 0.9, marginBottom: 24, fontSize: 14 }}>Teams & advocacy groups</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, fontSize: 15, lineHeight: 2 }}>
              <li>✓ 1,000 fact checks/month</li>
              <li>✓ Up to 10 team seats</li>
              <li>✓ Shared analysis library</li>
              <li>✓ White-label exports</li>
              <li>✓ Dedicated support</li>
            </ul>
            <button
              onClick={() => startCheckout('organization')}
              style={{ width: '100%', padding: '14px 24px', background: 'white', color: '#667eea', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}
            >
              Upgrade to Organization
            </button>
          </div>
        </div>

        {/* Who This Is For */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
            Who This Is For
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Political Commentators</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                You speak publicly. One mistake damages credibility for months.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Journalists</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                Fast verification with receipts. Your reputation is your career.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📢</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Organizers</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                Train your team. Consistent messaging. Legal protection.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Educators</h3>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                Teach media literacy with live examples. Show, don't tell.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
            Questions
          </h2>
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Why not just use Google?
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
                Google shows you results. We show you whether those results support, refute, or provide context for specific claims. Big difference.
              </p>
            </div>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                What happens when I hit my limit?
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
                You can still analyze cached results and export Teaching Takes. You just can't pull fresh evidence until next month or you upgrade.
              </p>
            </div>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Can I cancel anytime?
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
                Yes. No long-term contracts. 14-day money-back guarantee if you're not happy.
              </p>
            </div>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Do you track my searches?
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.7 }}>
                We cache analysis results to save costs. We never sell data. See our privacy policy for details.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
