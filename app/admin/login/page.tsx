'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && (data.error || data.message)) || 'Login failed');
        return;
      }
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Admin</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Enter the admin password to continue.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => (e.key === 'Enter' ? submit() : undefined)}
          placeholder="Admin password"
          style={{ width: '100%', padding: '12px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', marginBottom: 12 }}
        />

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !password}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#111827', color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
          Set <code>ADMIN_PASSWORD</code> in <code>.env.local</code>.
        </p>
      </div>
    </main>
  );
}
