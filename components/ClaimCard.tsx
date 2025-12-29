'use client';

import type { Claim, EvidenceItem } from '@/lib/types';

function stanceBadge(stance?: EvidenceItem['stance']): { label: string; className: string } {
  const s = (stance || 'unclear').toString().toLowerCase();
  if (s === 'support') return { label: 'Supports', className: 'bg-green-50 text-green-900 border-green-200' };
  if (s === 'refute') return { label: 'Refutes', className: 'bg-slate-50 text-slate-900 border-slate-200' };
  if (s === 'context') return { label: 'Context', className: 'bg-amber-50 text-amber-900 border-amber-200' };
  return { label: 'Unclear', className: 'bg-slate-50 text-slate-700 border-slate-200' };
}

function verdictBadge(verdict?: string): { className: string } {
  switch (verdict) {
    case 'Supported':
      return { className: 'bg-green-50 text-green-900 border-green-200' };
    case 'Likely supported':
      return { className: 'bg-green-50 text-green-900 border-green-200' };
    case 'Not supported':
      return { className: 'bg-slate-50 text-slate-900 border-slate-200' };
    case 'Mixed':
    case 'Mixed/unclear':
      return { className: 'bg-amber-50 text-amber-900 border-amber-200' };
    case 'Not verified yet':
    case 'No corroboration found':
    case 'Insufficient evidence':
      return { className: 'bg-blue-50 text-blue-900 border-blue-200' };
    default:
      return { className: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

export function ClaimCard({ claim }: { claim: Claim }) {
  const verdict = verdictBadge(claim.verdict);
  const corroborating = claim.evidence.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 leading-relaxed">{claim.text}</div>
          {claim.reasoning ? <p className="mt-2 text-sm text-slate-600">{claim.reasoning}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${verdict.className}`}>
            {claim.verdict || 'Verdict'}
          </span>
          {typeof claim.verdictConfidence === 'number' ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {Math.round(claim.verdictConfidence * 100)}% confidence
            </span>
          ) : null}
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">
          Evidence ({corroborating.length})
        </summary>

        <div className="mt-3 grid gap-2">
          {corroborating.length === 0 ? (
            <div className="text-sm text-slate-600">No corroborating sources were attached to this claim.</div>
          ) : (
            corroborating.map((e, idx) => {
              const badge = stanceBadge(e.stance);
              return (
                <a
                  key={idx}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {e.title || e.publisher || e.domain}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {(e.publisher || e.domain) ? `${e.publisher || e.domain}` : ''}
                        {e.domain ? ` • ${e.domain}` : ''}
                        {e.published_at ? ` • ${e.published_at}` : ''}
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  {e.snippet ? <div className="mt-2 text-sm text-slate-700 leading-relaxed">{e.snippet}</div> : null}
                </a>
              );
            })
          )}
        </div>

        {claim.suggestedSearches && claim.suggestedSearches.length > 0 ? (
          <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Suggested searches ({claim.suggestedSearches.length})
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {claim.suggestedSearches.slice(0, 3).map((q, i) => (
                <a
                  key={i}
                  href={`https://search.brave.com/search?q=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                >
                  {q}
                </a>
              ))}
            </div>
          </details>
        ) : null}
      </details>
    </article>
  );
}
