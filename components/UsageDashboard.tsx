'use client';

import { useEffect, useState } from 'react';

export type UsageTier = 'free' | 'pro' | 'creator';

interface UsageData {
  fact_checks: {
    used: number;
    limit: number;
    rollover: number;
    remaining: number;
    percentage: number;
  };
  analysis_runs: {
    used: number;
    unlimited: boolean;
  };
  cost: {
    estimated_this_period: number;
    average_per_check: number;
  };
  resets_at: Date;
}

interface UsageDashboardProps {
  userId: string;
  tier: UsageTier;
}

export function UsageDashboard({ userId, tier }: UsageDashboardProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch(`/api/usage?userId=${userId}&tier=${tier}`);
        if (!response.ok) throw new Error('Failed to fetch usage');
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [userId, tier]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-800">Error loading usage data: {error}</p>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { fact_checks, analysis_runs, cost, resets_at } = usage;
  const resetDate = new Date(resets_at);

  return (
    <div className="space-y-6">
      {/* Fact Checks Card */}
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fact Checks</h3>
            <p className="text-sm text-gray-500 mt-1">
              Live evidence retrieval from external sources
            </p>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {fact_checks.used}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {fact_checks.used} / {fact_checks.limit + fact_checks.rollover} used
            </span>
            <span className={`font-medium ${
              fact_checks.remaining === 0 
                ? 'text-red-600' 
                : fact_checks.remaining < 5 
                  ? 'text-orange-600' 
                  : 'text-gray-600'
            }`}>
              {fact_checks.remaining} remaining
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                fact_checks.percentage >= 90
                  ? 'bg-red-500'
                  : fact_checks.percentage >= 75
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, fact_checks.percentage)}%` }}
            />
          </div>
        </div>

        {fact_checks.rollover > 0 && (
          <div className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded mb-3">
            ✨ +{fact_checks.rollover} rollover credits from last month
          </div>
        )}

        <div className="text-xs text-gray-500">
          Resets on {resetDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>

        {fact_checks.remaining === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              You've reached your monthly limit
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              You can still view previous analyses and access educational content.
            </p>
            {tier === 'free' && (
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                Upgrade to Pro - 50 checks/month + unlimited analysis
              </button>
            )}
            {tier === 'pro' && (
              <button className="w-full bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700">
                Upgrade to Professional - 250 checks/month + multi-platform
              </button>
            )}
          </div>
        )}
      </div>

      {/* Analysis Runs Card */}
      {tier !== 'free' && (
        <div className="p-6 bg-white rounded-lg shadow-sm border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analysis Runs</h3>
              <p className="text-sm text-gray-500 mt-1">
                Civic Breakdowns, responses, action plans
              </p>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {analysis_runs.unlimited ? '∞' : analysis_runs.used}
            </span>
          </div>

          {analysis_runs.unlimited && (
            <div className="text-sm bg-green-50 text-green-700 px-3 py-2 rounded">
              ✓ Unlimited - Run as many analyses as you need on cached results
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            {analysis_runs.used} runs this month
          </div>
        </div>
      )}

      {/* Cost Tracking (for transparency) */}
      {tier !== 'free' && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">This Month</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Estimated Cost</div>
              <div className="font-mono font-medium">
                ${cost.estimated_this_period.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Avg per Check</div>
              <div className="font-mono font-medium">
                ${cost.average_per_check.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Pro Tip</h4>
        <p className="text-sm text-blue-800">
          {tier === 'free' 
            ? 'Each fact check retrieves live evidence. Upgrade to Pro for 50 checks/month plus unlimited Civic Breakdowns and responses.'
            : tier === 'pro'
              ? 'Run 1 fact check, then generate unlimited responses, Civic Breakdowns, and action plans from that evidence!'
              : 'Your rollover credits accumulate up to 2× your monthly limit. Unused checks never go to waste!'}
        </p>
      </div>
    </div>
  );
}
