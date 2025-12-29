'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult, TeachingTake, UsageTier } from '@/lib/types';
import { TeachingTakeDisplay } from '@/components/TeachingTakeDisplay';
import { demoTopic } from '@/lib/demo-data';

type Stats = {
  usage: any;
  cache: any;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<UsageTier>('free');
  const [userResult, setUserResult] = useState<any>(null);

  const [cacheHash, setCacheHash] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const [labEmail, setLabEmail] = useState('');
  const [labInput, setLabInput] = useState('');
  const [labAnalysis, setLabAnalysis] = useState<AnalysisResult | null>(null);
  const [labTeachingTake, setLabTeachingTake] = useState<TeachingTake | null>(null);
  const [labRunning, setLabRunning] = useState(false);
  const [labGeneratingTT, setLabGeneratingTT] = useState(false);

  const tiers = useMemo<UsageTier[]>(() => ['free', 'pro', 'creator', 'organization'], []);

  async function refreshStats() {
    setLoadingStats(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load stats');
      setStats(json);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }

  async function setUserTierAction() {
    setMessage(null);
    const res = await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setTier', email, tier }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage((json && (json.error || json.message)) || 'Failed to set tier');
      return;
    }
    setUserResult(json.user);
    setMessage('User updated.');
    await refreshStats();
  }

  async function fetchUser() {
    setMessage(null);
    const res = await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', email }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage((json && (json.error || json.message)) || 'Failed to fetch user');
      return;
    }
    setUserResult(json.user);
  }

  async function clearExpiredCache() {
    setMessage(null);
    const res = await fetch('/api/admin/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clearExpired' }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage((json && (json.error || json.message)) || 'Failed to clear cache');
      return;
    }
    setMessage(`Cleared ${json.cleared} expired cache entries.`);
    await refreshStats();
  }

  async function invalidateCache() {
    setMessage(null);
    const res = await fetch('/api/admin/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalidate', inputHash: cacheHash }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage((json && (json.error || json.message)) || 'Failed to invalidate cache');
      return;
    }
    setMessage(json.deleted ? 'Cache entry deleted.' : 'Cache entry not found.');
    await refreshStats();
  }

  function extractErrorFromJson(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    const error = obj.error;
    const message = obj.message;
    const details = obj.details;
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof error === 'string' && error.trim()) return error;
    if (typeof details === 'string' && details.trim()) return details;
    return undefined;
  }

  async function runLabAnalysis() {
    setMessage(null);
    setLabTeachingTake(null);
    setLabAnalysis(null);

    const normalizedEmail = labEmail.trim().toLowerCase();
    const input = labInput.trim();

    if (!normalizedEmail) {
      setMessage('Enter an email for the Test Lab (tiers are tied to email).');
      return;
    }
    if (input.length < 8) {
      setMessage('Enter an input (min 8 characters).');
      return;
    }

    setLabRunning(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, email: normalizedEmail }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(extractErrorFromJson(json) || text || `Analyze failed (${res.status})`);
      }

      setLabAnalysis(json as AnalysisResult);
      setMessage('Analysis complete.');
      await refreshStats();
    } catch (e: any) {
      setMessage(e?.message || 'Analyze failed.');
    } finally {
      setLabRunning(false);
    }
  }

  async function generateLabTeachingTake() {
    setMessage(null);
    if (!labAnalysis) {
      setMessage('Run analysis first.');
      return;
    }

    setLabGeneratingTT(true);
    try {
      const res = await fetch('/api/teaching-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: labAnalysis, topic: labInput.trim() }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(extractErrorFromJson(json) || `Teaching take failed (${res.status})`);
      }

      setLabTeachingTake(json as TeachingTake);
      setMessage('Teaching Take generated.');
    } catch (e: any) {
      setMessage(e?.message || 'Teaching Take generation failed.');
    } finally {
      setLabGeneratingTT(false);
    }
  }

  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Admin</h1>
      <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
        Back office controls for testing tiers, metering, and caching.
      </p>

      {message && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>System stats</h2>
            <button onClick={refreshStats} disabled={loadingStats} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 700 }}>
              {loadingStats ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <pre style={{ margin: 0, fontSize: 12, background: '#0b1020', color: '#e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
            {stats ? JSON.stringify(stats, null, 2) : 'Loading…'}
          </pre>
        </section>

        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>User tier controls</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@email.com"
              style={{ flex: '1 1 260px', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as UsageTier)}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white' }}
            >
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button onClick={setUserTierAction} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#111827', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Set tier
            </button>
            <button onClick={fetchUser} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Fetch user
            </button>
          </div>
          <pre style={{ margin: 0, fontSize: 12, background: '#f9fafb', border: '1px solid #e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
            {userResult ? JSON.stringify(userResult, null, 2) : 'No user loaded.'}
          </pre>
          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
            Tip: after setting a user tier, refresh the app pages to re-fetch tier via <code>/api/me</code>.
          </div>
        </section>

        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Cache controls</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={clearExpiredCache} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Clear expired
            </button>
            <input
              value={cacheHash}
              onChange={(e) => setCacheHash(e.target.value)}
              placeholder="inputHash to invalidate"
              style={{ flex: '1 1 340px', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <button onClick={invalidateCache} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Invalidate
            </button>
          </div>
        </section>

        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Test Lab</h2>
            <a href="/demo" style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}>
              Open buyer demo →
            </a>
          </div>

          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12, color: '#6b7280' }}>
            Run live analysis as any email (tier is derived server-side). Useful for demos, support, and verifying quota behavior.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input
              value={labEmail}
              onChange={(e) => setLabEmail(e.target.value)}
              placeholder="demo@buyer.com"
              style={{ flex: '1 1 260px', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
            />
            <button
              onClick={() => {
                setLabInput(demoTopic);
                if (!labEmail.trim()) setLabEmail(email || 'demo@buyer.com');
              }}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', fontWeight: 800, cursor: 'pointer' }}
            >
              Use demo input
            </button>
            <button
              onClick={runLabAnalysis}
              disabled={labRunning}
              style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#111827', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: labRunning ? 0.6 : 1 }}
            >
              {labRunning ? 'Analyzing…' : 'Run analysis'}
            </button>
            <button
              onClick={generateLabTeachingTake}
              disabled={!labAnalysis || labGeneratingTT}
              style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#9333ea', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: !labAnalysis || labGeneratingTT ? 0.6 : 1 }}
            >
              {labGeneratingTT ? 'Generating…' : 'Generate Teaching Take'}
            </button>
          </div>

          <textarea
            value={labInput}
            onChange={(e) => setLabInput(e.target.value)}
            placeholder="Paste a URL or text to analyze"
            rows={5}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 10, fontFamily: 'inherit' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Analysis JSON</div>
              <pre style={{ margin: 0, fontSize: 12, background: '#0b1020', color: '#e5e7eb', padding: 12, borderRadius: 10, overflowX: 'auto' }}>
                {labAnalysis ? JSON.stringify(labAnalysis, null, 2) : 'Run analysis to see output.'}
              </pre>
            </div>
            {labTeachingTake && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Teaching Take (unlocked)</div>
                <TeachingTakeDisplay teachingTake={labTeachingTake} topic={labInput.trim()} isLocked={false} />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
