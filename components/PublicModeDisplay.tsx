'use client';

import { useState } from 'react';
import type { TeachingTake } from '@/lib/types';

interface PublicModeDisplayProps {
  teachingTake: TeachingTake;
  topic?: string;
  onUpgrade?: () => void;
  tier?: string;
}

export function PublicModeDisplay({ teachingTake, topic, onUpgrade, tier = 'free' }: PublicModeDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Topline */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6">
        <div className="text-sm font-extrabold text-blue-900">What we can prove</div>
        <div className="mt-2 text-base font-semibold leading-snug text-blue-900">
          {teachingTake.topline}
        </div>
      </section>

      {/* What We Know */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">What we know</div>
        <p className="mt-1 text-xs text-slate-600">Backed by sources</p>
        <ul className="mt-3 space-y-2">
          {teachingTake.what_we_know.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-emerald-600">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What's Unclear */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">What's unclear</div>
        <p className="mt-1 text-xs text-slate-600">Needs more evidence</p>
        <ul className="mt-3 space-y-2">
          {teachingTake.what_is_unclear.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-amber-600">?</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What to Say Back */}
      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-violet-900">What to say back</div>
            <p className="mt-1 text-xs text-violet-700">Copy-paste ready</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(teachingTake.what_to_say_back, 'rebuttal')}
            className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100"
          >
            {copiedSection === 'rebuttal' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-violet-900">
          {teachingTake.what_to_say_back}
        </div>
      </section>

      {/* Action Plan */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">What to do next</div>
        <p className="mt-1 text-xs text-slate-600">Tiny, concrete, legal</p>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-700">Today</div>
            <ul className="mt-2 space-y-1">
              {teachingTake.action_plan.today.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">This week</div>
            <ul className="mt-2 space-y-1">
              {teachingTake.action_plan.this_week.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Ongoing</div>
            <ul className="mt-2 space-y-1">
              {teachingTake.action_plan.ongoing.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Show Details Toggle */}
      {(teachingTake.how_this_gets_spun || teachingTake.deeper_rebuttal) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <div className="text-sm font-extrabold text-slate-900">Show details</div>
              <p className="mt-1 text-xs text-slate-600">How it gets spun + deeper analysis</p>
            </div>
            <div className="text-slate-400">{showDetails ? '▼' : '▶'}</div>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
              {teachingTake.how_this_gets_spun && teachingTake.how_this_gets_spun.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700">How this gets spun</div>
                  <ul className="mt-2 space-y-1">
                    {teachingTake.how_this_gets_spun.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {teachingTake.deeper_rebuttal && (
                <div>
                  <div className="text-xs font-semibold text-slate-700">Deeper analysis</div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-700">
                    {teachingTake.deeper_rebuttal}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Upgrade CTA for Free tier */}
      {tier === 'free' && (
        <section className="rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
          <div className="text-base font-extrabold text-slate-900">Want more?</div>
          <p className="mt-2 text-sm text-slate-700">
            Upgrade to Pro ($25/month) for:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>• Full Teaching Takes with extended rebuttals</li>
            <li>• PDF & text exports</li>
            <li>• Social media snippets</li>
            <li>• 50 fact checks/month (vs 10)</li>
          </ul>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-violet-700"
          >
            Upgrade to Pro
          </button>
        </section>
      )}
    </div>
  );
}
