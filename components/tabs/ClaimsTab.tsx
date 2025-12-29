'use client';

import type { AnalysisResult } from '@/lib/types';
import { ClaimCard } from '@/components/ClaimCard';

export function ClaimsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">
        Statement-by-statement results with evidence. Open a statement to see sources and suggested searches.
      </div>
      <div className="grid gap-3">
        {result.claims.map((c, idx) => (
          <ClaimCard key={idx} claim={c} />
        ))}
      </div>
    </div>
  );
}
