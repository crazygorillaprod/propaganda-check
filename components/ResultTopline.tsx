'use client';

import type { AnalysisResult } from '@/lib/types';

function computeCorroboratingSourceCount(result: AnalysisResult): number {
  return (
    result?.claims?.reduce((sum, c) => {
      const corroboration = c.evidence.filter((e) => (e.role ?? 'CORROBORATION') !== 'INPUT');
      return sum + corroboration.length;
    }, 0) ?? 0
  );
}

function getRetrievalState(result: AnalysisResult): string | undefined {
  const overall = result.overall_score ?? result.overallVerifiability;
  const retrievalState: string | undefined =
    overall?.retrieval_state ??
    (overall?.status === 'NOT_RUN'
      ? 'NOT_RUN'
      : overall?.status === 'NO_EVIDENCE_FOUND'
        ? 'RAN_NO_RESULTS'
        : overall?.status === 'EVIDENCE_FOUND'
          ? 'RAN_WITH_RESULTS'
          : undefined);

  const corroboratingSourceCount = computeCorroboratingSourceCount(result);
  if (retrievalState === 'RAN_WITH_RESULTS' && corroboratingSourceCount === 0) {
    return 'RAN_NO_RESULTS';
  }

  return retrievalState;
}

function getStatusPresentation(result: AnalysisResult): {
  label: string;
  subtitle: string;
  tone: 'info' | 'neutral';
} {
  const overall = result.overall_score ?? result.overallVerifiability;
  const retrievalReason: string | undefined = overall?.message ?? overall?.retrieval_reason;
  const state = getRetrievalState(result);

  if (state === 'NOT_RUN') {
    return {
      label: 'Not verified yet',
      subtitle: retrievalReason || 'Evidence retrieval not run',
      tone: 'info',
    };
  }

  if (state === 'RAN_NO_RESULTS') {
    return {
      label: 'Not verified (no corroborating sources retrieved)',
      subtitle: retrievalReason || 'Search ran but returned no corroborating sources.',
      tone: 'info',
    };
  }

  if (state === 'RAN_WITH_RESULTS') {
    return {
      label: 'Evidence retrieved',
      subtitle: 'Claims were checked against retrieved sources.',
      tone: 'neutral',
    };
  }

  return {
    label: 'Status unavailable',
    subtitle: '',
    tone: 'neutral',
  };
}

function getSummarySentence(score?: number): string {
  if (typeof score !== 'number') return '';
  if (score >= 70) return 'Strong support from available sources.';
  if (score >= 40) return 'Moderate support from available sources.';
  return 'Limited support from available sources.';
}

export function ResultTopline({ result }: { result: AnalysisResult }) {
  const overall = result.overall_score ?? result.overallVerifiability;
  const status = getStatusPresentation(result);
  const sentence = getSummarySentence(overall?.score ?? undefined);

  const badgeClass =
    status.tone === 'info'
      ? 'bg-blue-50 text-blue-900 border-blue-200'
      : 'bg-slate-50 text-slate-900 border-slate-200';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            Verification status: {status.label}
          </div>
          {sentence ? <div className="text-xs sm:text-sm text-slate-600">{sentence}</div> : null}
        </div>
        {status.subtitle ? <div className="text-sm text-slate-600">{status.subtitle}</div> : null}
      </div>
    </section>
  );
}
