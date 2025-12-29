'use client';

import type { AnalysisResult, EvidenceItem } from '@/lib/types';
import { EvidenceCluster } from '@/components/EvidenceCluster';
import { sanitizeUrl } from '@/lib/sanitize';

function uniqueEvidence(result: AnalysisResult): EvidenceItem[] {
  const seen = new Set<string>();
  const out: EvidenceItem[] = [];

  for (const claim of result.claims) {
    for (const e of claim.evidence) {
      if ((e.role ?? 'CORROBORATION') === 'INPUT') continue;
      const key = `${e.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }

  return out;
}

export function SourcesTab({ result }: { result: AnalysisResult }) {
  const sources = uniqueEvidence(result);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Sources ({sources.length})</div>
        <p className="mt-1 text-sm text-slate-600">
          These are the unique sources used across all claims. Open to review context.
        </p>

        {result.article_meta?.canonical_url ? (
          <div className="mt-3 text-xs text-slate-600">
            Article: <a className="text-blue-700 hover:underline" href={result.article_meta.canonical_url} target="_blank" rel="noreferrer">{sanitizeUrl(String(result.article_meta.canonical_url))}</a>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {sources.map((e, idx) => (
          <EvidenceCluster key={idx} evidence={e} />
        ))}
      </div>

      {sources.length === 0 ? (
        <div className="text-sm text-slate-600">No sources were retrieved for this analysis.</div>
      ) : null}
    </div>
  );
}
