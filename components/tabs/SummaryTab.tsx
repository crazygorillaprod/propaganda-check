'use client';

import { useState } from 'react';
import type { AnalysisResult, TeachingTake, UsageTier } from '@/lib/types';
import { TeachingTakeDisplay } from '@/components/TeachingTakeDisplay';
import { PublicModeDisplay } from '@/components/PublicModeDisplay';

function getLanguageRiskPresentation(score?: number) {
  if (typeof score !== 'number') {
    return {
      label: 'Not assessed',
      showNumeric: false,
      badge: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  }

  if (score >= 65) {
    return {
      label: 'Elevated language framing risk',
      showNumeric: true,
      badge: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }

  if (score >= 40) {
    return {
      label: 'Moderate language framing risk',
      showNumeric: false,
      badge: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }

  return {
    label: 'No significant language risk detected',
    showNumeric: false,
    badge: 'bg-blue-50 text-blue-900 border-blue-200',
  };
}

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

export function SummaryTab({
  input,
  result,
  tier,
  teachingTake,
  loadingTeachingTake,
  showTeachingTake,
  onGenerateTeachingTake,
}: {
  input: string;
  result: AnalysisResult;
  tier: UsageTier;
  teachingTake: TeachingTake | null;
  loadingTeachingTake: boolean;
  showTeachingTake: boolean;
  onGenerateTeachingTake: () => Promise<void>;
}) {
  const [displayMode, setDisplayMode] = useState<'public' | 'professional'>('public');
  const overall = result.overall_score ?? result.overallVerifiability;
  const retrievalState = getRetrievalState(result);
  const corroboratingSourceCount = computeCorroboratingSourceCount(result);
  const ranWithSources = retrievalState === 'RAN_WITH_RESULTS' && corroboratingSourceCount > 0;

  const language = getLanguageRiskPresentation(result.tactics?.score_0_to_100);

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Verification score</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            {ranWithSources && typeof overall?.score === 'number' ? `${overall.score}/100` : 'N/A'}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {ranWithSources
              ? 'Based on retrieved sources for the extracted claims.'
              : 'Score is only available after evidence retrieval returns sources.'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Language risk</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${language.badge}`}>
              {language.label}
            </span>
            {language.showNumeric && typeof result.tactics?.score_0_to_100 === 'number' ? (
              <span className="text-xs font-semibold text-slate-600">Score: {result.tactics.score_0_to_100}/100</span>
            ) : null}
          </div>
          {result.tactics?.flags?.length ? (
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                Flags ({result.tactics.flags.length})
              </summary>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {result.tactics.flags.slice(0, 6).map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
              {result.tactics.explanation ? <p className="mt-2 text-sm text-slate-600">{result.tactics.explanation}</p> : null}
            </details>
          ) : null}
        </div>
      </div>

      {result.rebuttal?.short ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Calm rebuttal</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{result.rebuttal.short}</p>
          {result.rebuttal.medium ? (
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Expanded version</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{result.rebuttal.medium}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {tier === 'free' ? 'Teaching Take preview' : 'Teaching Take'}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {tier === 'free'
                ? 'Preview rebuttal scripts, talk tracks, and export tools. Upgrade to unlock full access.'
                : 'Generate rebuttal scripts, talk tracks, and exportable resources from this analysis.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateTeachingTake}
            disabled={loadingTeachingTake}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingTeachingTake ? 'Generating…' : tier === 'free' ? 'Preview Teaching Take' : 'Generate Teaching Take'}
          </button>
        </div>

        {showTeachingTake && teachingTake ? (
          <div className="mt-4">
            {/* Mode Toggle - only show for paid tiers */}
            {tier !== 'free' && (
              <div className="mb-4 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode('public')}
                  className={
                    displayMode === 'public'
                      ? 'flex-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                      : 'flex-1 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100'
                  }
                >
                  <div className="text-xs font-semibold">Public</div>
                  <div className="mt-0.5 text-[10px] font-normal opacity-80">Fast-scan, 6th grade</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('professional')}
                  className={
                    displayMode === 'professional'
                      ? 'flex-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                      : 'flex-1 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100'
                  }
                >
                  <div className="text-xs font-semibold">Professional</div>
                  <div className="mt-0.5 text-[10px] font-normal opacity-80">Journalist-safe, neutral</div>
                </button>
              </div>
            )}

            {/* Always show Public Mode for free tier, or based on toggle for paid */}
            {tier === 'free' || displayMode === 'public' ? (
              <PublicModeDisplay teachingTake={teachingTake} topic={input} onUpgrade={handleUpgrade} tier={tier} />
            ) : displayMode === 'professional' ? (
              <TeachingTakeDisplay teachingTake={teachingTake} topic={input} isLocked={false} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
