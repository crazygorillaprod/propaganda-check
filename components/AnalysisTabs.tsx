'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, TeachingTake, UsageTier } from '@/lib/types';
import { SummaryTab } from './tabs/SummaryTab';
import { ClaimsTab } from './tabs/ClaimsTab';
import { SourcesTab } from './tabs/SourcesTab';
import { LearnTab } from './tabs/LearnTab';

type TabKey = 'summary' | 'claims' | 'sources' | 'learn';

type AnalysisTabsProps = {
  input: string;
  result: AnalysisResult;
  tier: UsageTier;
  teachingTake: TeachingTake | null;
  loadingTeachingTake: boolean;
  showTeachingTake: boolean;
  onGenerateTeachingTake: () => Promise<void>;
};

export function AnalysisTabs({
  input,
  result,
  tier,
  teachingTake,
  loadingTeachingTake,
  showTeachingTake,
  onGenerateTeachingTake,
}: AnalysisTabsProps) {
  const [tab, setTab] = useState<TabKey>('summary');

  const tabs = useMemo(
    () =>
      [
        { key: 'summary' as const, label: 'Summary' },
        { key: 'claims' as const, label: 'Claims' },
        { key: 'sources' as const, label: 'Sources' },
        { key: 'learn' as const, label: 'Learn' },
      ],
    []
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                active
                  ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                  : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50'
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        {tab === 'summary' ? (
          <SummaryTab
            input={input}
            result={result}
            tier={tier}
            teachingTake={teachingTake}
            loadingTeachingTake={loadingTeachingTake}
            showTeachingTake={showTeachingTake}
            onGenerateTeachingTake={onGenerateTeachingTake}
          />
        ) : null}

        {tab === 'claims' ? <ClaimsTab result={result} /> : null}
        {tab === 'sources' ? <SourcesTab result={result} /> : null}
        {tab === 'learn' ? <LearnTab /> : null}
      </div>
    </section>
  );
}
