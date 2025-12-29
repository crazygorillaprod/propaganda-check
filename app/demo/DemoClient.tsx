'use client';

import { TeachingTakeDisplay } from '@/components/TeachingTakeDisplay';
import { demoAnalysisResult, demoTeachingTake, demoTopic } from '@/lib/demo-data';

function getStanceBadge(stance: string) {
  const normalized = (stance || '').toLowerCase();
  if (normalized === 'support') return { bg: '#d1fae5', color: '#065f46', label: 'Supports' };
  if (normalized === 'refute') return { bg: '#fee2e2', color: '#991b1b', label: 'Refutes' };
  if (normalized === 'context') return { bg: '#fef3c7', color: '#92400e', label: 'Context' };
  return { bg: '#f3f4f6', color: '#374151', label: 'Unclear' };
}

export default function DemoClient() {
  const r = demoAnalysisResult;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 950, margin: 0, letterSpacing: -0.5 }}>Buyer Demo</h1>
          <p style={{ marginTop: 10, marginBottom: 0, color: '#4b5563', fontSize: 15, lineHeight: 1.6 }}>
            A no-signup walkthrough of Propaganda Buster’s core features: evidence retrieval, verifiability scoring, claim-by-claim verdicts,
            and Teaching Takes (exportable rebuttal scripts and talk tracks).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: 'white',
              textDecoration: 'none',
              fontWeight: 800,
              color: '#111827',
            }}
          >
            Try live analysis
          </a>
          <a
            href="/pricing"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#111827',
              textDecoration: 'none',
              fontWeight: 900,
              color: 'white',
            }}
          >
            See pricing
          </a>
        </div>
      </div>

      <section style={{ marginTop: 22, border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, background: '#f9fafb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#111827' }}>Demo input</div>
            <div style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>{demoTopic}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', border: '1px solid #e5e7eb', fontSize: 13 }}>
              Verifiability score: <b>{r.overall_score.score}</b>/100
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', border: '1px solid #e5e7eb', fontSize: 13 }}>
              Claims: <b>{r.claims.length}</b>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>Claim-by-claim results</h2>
        <p style={{ marginTop: 8, marginBottom: 14, color: '#4b5563', fontSize: 13, lineHeight: 1.6 }}>
          This shows how the product breaks an input into checkable claims, retrieves evidence, then assigns a verdict with confidence.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          {r.claims.map((c, idx) => (
            <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900, color: '#111827', lineHeight: 1.45 }}>{c.text}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}>
                    Verdict: <b>{c.verdict}</b>
                  </span>
                  <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}>
                    Confidence: <b>{Math.round((c.verdictConfidence || 0) * 100)}%</b>
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 10, color: '#374151', fontSize: 13, lineHeight: 1.6 }}>{c.reasoning}</div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Evidence</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {c.evidence.map((e, i) => {
                    const badge = getStanceBadge(e.stance);
                    return (
                      <a
                        key={i}
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          padding: 12,
                          textDecoration: 'none',
                          color: '#111827',
                          background: '#f9fafb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 850 }}>{e.title || e.domain}</div>
                          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 900 }}>
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                          {e.publisher} • {e.domain}{e.published_at ? ` • ${e.published_at}` : ''}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{e.snippet}</div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, background: 'linear-gradient(to right, #faf5ff, #eff6ff)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>Teaching Take (exportable)</h2>
        <p style={{ marginTop: 8, marginBottom: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.6 }}>
          This is the “ready-to-use” output for people who publish opinions publicly: rebuttal scripts, talk tracks, action plan, and exports.
        </p>
        <div style={{ marginTop: 14 }}>
          <TeachingTakeDisplay teachingTake={demoTeachingTake} topic={demoTopic} isLocked={false} />
        </div>
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0 }}>What buyers usually ask</h2>
        <div style={{ marginTop: 10, color: '#374151', fontSize: 13, lineHeight: 1.7 }}>
          <div><b>How is this different from “AI summaries”?</b> It shows its work: claims, sources, stance, and a verifiability score.</div>
          <div style={{ marginTop: 6 }}><b>Can we test it on our topics?</b> Yes — use the live analyzer or the admin Test Lab.</div>
          <div style={{ marginTop: 6 }}><b>Does it prevent tier spoofing?</b> Paid access is derived server-side from verified email + Stripe/webhooks.</div>
        </div>
      </section>
    </main>
  );
}
