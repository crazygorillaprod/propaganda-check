'use client';

import type { EvidenceItem } from '@/lib/types';

function stanceBadge(stance?: EvidenceItem['stance']): { label: string; className: string } {
  const s = (stance || 'unclear').toString().toLowerCase();
  if (s === 'support') return { label: 'Supports', className: 'bg-green-50 text-green-900 border-green-200' };
  if (s === 'refute') return { label: 'Refutes', className: 'bg-slate-50 text-slate-900 border-slate-200' };
  if (s === 'context') return { label: 'Context', className: 'bg-amber-50 text-amber-900 border-amber-200' };
  return { label: 'Unclear', className: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export function EvidenceCluster({ evidence }: { evidence: EvidenceItem }) {
  const badge = stanceBadge(evidence.stance);

  return (
    <a
      href={evidence.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {evidence.title || evidence.publisher || evidence.domain}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {(evidence.publisher || evidence.domain) ? `${evidence.publisher || evidence.domain}` : ''}
            {evidence.domain ? ` • ${evidence.domain}` : ''}
            {evidence.published_at ? ` • ${evidence.published_at}` : ''}
          </div>
        </div>

        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {evidence.snippet ? <div className="mt-2 text-sm text-slate-700 leading-relaxed">{evidence.snippet}</div> : null}
    </a>
  );
}
