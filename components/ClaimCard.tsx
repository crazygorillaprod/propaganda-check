'use client';

import type { Claim, EvidenceItem } from '@/lib/types';

function getFirstSentences(text: string, maxSentences: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/(?<=[.!?])\s+/g).filter(Boolean);
  return parts.slice(0, maxSentences).join(' ').trim();
}

function getOutletKey(e: EvidenceItem): string {
  return (e.publisher || e.domain || e.title || 'unknown').toString().trim().toLowerCase();
}

function uniqueByOutlet(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const out: EvidenceItem[] = [];
  for (const item of items) {
    const key = getOutletKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

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

function displayVerdict(verdict?: string): string {
  switch (verdict) {
    case 'Likely supported':
      return 'Supported';
    case 'Mixed/unclear':
      return 'Mixed';
    case 'No corroboration found':
    case 'Insufficient evidence':
      return 'Not verified yet';
    default:
      return verdict || 'Not verified yet';
  }
}

export function ClaimCard({ claim }: { claim: Claim }) {
  const verdict = verdictBadge(claim.verdict);
  const inputEvidence = claim.evidence.filter((e) => e.role === 'INPUT');
  const corroboratingRaw = claim.evidence.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');
  const corroborating = uniqueByOutlet(corroboratingRaw);
  const shortReasoning = claim.reasoning ? getFirstSentences(claim.reasoning, 2) : '';
  const verdictLabel = displayVerdict(claim.verdict);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 leading-relaxed">{claim.text}</div>
          {shortReasoning ? <p className="mt-2 text-sm text-slate-600">{shortReasoning}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${verdict.className}`}>
            {verdictLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {corroborating.length} outlet{corroborating.length === 1 ? '' : 's'}
          </span>
          {typeof claim.verdictConfidence === 'number' ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {Math.round(claim.verdictConfidence * 100)}% confidence
            </span>
          ) : null}
        </div>
      </div>

      {/* Primary Source (INPUT) - show separately if present */}
      {inputEvidence.length > 0 && (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold text-blue-900 mb-2">Primary Source</div>
          {inputEvidence.map((e, idx) => (
            <a
              key={idx}
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-blue-300 bg-white p-3 hover:bg-blue-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {e.title || e.publisher || e.domain}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Provided article
                    {e.domain ? ` • ${e.domain}` : ''}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                  Input
                </span>
              </div>
              {e.snippet ? <div className="mt-2 text-sm text-slate-700 leading-relaxed">{e.snippet}</div> : null}
            </a>
          ))}
        </div>
      )}

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">
          Sources ({corroborating.length} outlet{corroborating.length === 1 ? '' : 's'})
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
