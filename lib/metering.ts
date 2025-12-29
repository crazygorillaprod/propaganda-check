import type { 
  UsageTier, 
  UsagePeriod, 
  UsageEvent, 
  QuotaCheckResult 
} from './types';

// Re-export types for external use
export type { UsageTier, UsagePeriod, UsageEvent, QuotaCheckResult };

/**
 * Usage metering implementation
 * 
 * Core principle: Fact checks cost money. Thinking does not.
 * - Meter external API calls (expensive)
 * - Don't meter analysis on cached results (cheap)
 */

// In-memory storage (replace with DB in production)
const usagePeriods = new Map<string, UsagePeriod>();
const usageEvents: UsageEvent[] = [];

/**
 * Gets the fact check limit for a tier
 */
export function getFactCheckLimit(tier: UsageTier): number {
  switch (tier) {
    case 'free': return 10;
    case 'pro': return 50;        // $25/month
    case 'creator': return 300;   // $99/month  
    case 'organization': return 1000; // $500/month
    default: return 10;
  }
}

/**
 * Gets the price for a tier
 */
export function getTierPrice(tier: UsageTier): number {
  switch (tier) {
    case 'free': return 0;
    case 'pro': return 25;
    case 'creator': return 99;
    case 'organization': return 500;
    default: return 0;
  }
}

/**
 * Gets the display name for a tier
 */
export function getTierName(tier: UsageTier): string {
  switch (tier) {
    case 'free': return 'Free';
    case 'pro': return 'Pro (Civic)';
    case 'creator': return 'Creator (Full Spectrum)';
    case 'organization': return 'Organization';
    default: return 'Free';
  }
}

/**
 * Gets the start of the current billing period
 */
function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Gets the end of the current billing period
 */
function getCurrentPeriodEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Calculates rollover credits from previous period
 * Only applies to creator tier
 */
async function calculateRollover(userId: string, tier: UsageTier): Promise<number> {
  // Only creator tier gets rollover
  if (tier !== 'creator') {
    return 0;
  }
  
  // Get previous period
  const previousPeriodKey = `${userId}:previous`;
  const previousPeriod = usagePeriods.get(previousPeriodKey);
  
  if (!previousPeriod) {
    return 0;
  }
  
  const unused = previousPeriod.fact_checks_limit - previousPeriod.fact_checks_used;
  
  // Cap at 2× monthly limit
  const maxRollover = getFactCheckLimit(tier) * 2;
  
  return Math.max(0, Math.min(unused, maxRollover));
}

/**
 * Gets or creates the current usage period for a user
 */
export async function getCurrentUsagePeriod(
  userId: string,
  tier: UsageTier = 'free'
): Promise<UsagePeriod> {
  const periodStart = getCurrentPeriodStart();
  const periodKey = `${userId}:${periodStart.toISOString()}`;
  
  let period = usagePeriods.get(periodKey);
  
  if (!period) {
    // Create new period
    const rollover = await calculateRollover(userId, tier);
    
    period = {
      user_id: userId,
      tier,
      period_start: periodStart,
      period_end: getCurrentPeriodEnd(),
      fact_checks_used: 0,
      fact_checks_limit: getFactCheckLimit(tier),
      fact_checks_rollover: rollover,
      analysis_runs_used: 0,
      estimated_cost: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    usagePeriods.set(periodKey, period);
  }
  
  return period;
}

/**
 * Checks if user has quota available for an operation
 */
export async function checkQuota(
  userId: string,
  tier: UsageTier,
  eventType: 'fact_check' | 'analysis_run'
): Promise<QuotaCheckResult> {
  const period = await getCurrentUsagePeriod(userId, tier);
  
  if (eventType === 'analysis_run') {
    // Analysis runs are unlimited for paid tiers
    if (tier === 'pro' || tier === 'creator' || tier === 'organization') {
      return { 
        allowed: true, 
        remaining: Infinity,
        total_available: Infinity
      };
    }
    
    // Free tier doesn't have analysis runs
    return { 
      allowed: false, 
      remaining: 0,
      total_available: 0,
      reason: 'Upgrade to Pro for unlimited analysis tools (Teaching Takes, rebuttals, action plans)'
    };
  }
  
  if (eventType === 'fact_check') {
    const totalAvailable = period.fact_checks_limit + period.fact_checks_rollover;
    const remaining = totalAvailable - period.fact_checks_used;
    
    if (remaining > 0) {
      return { 
        allowed: true, 
        remaining,
        total_available: totalAvailable
      };
    }
    
    const upgradeMessage = tier === 'free' 
      ? 'Upgrade to Pro for 50 checks/month + unlimited analysis tools'
      : tier === 'pro'
        ? 'Upgrade to Creator for 250 checks/month + multi-platform analysis'
        : 'You\'ve reached your monthly limit. Resets soon!';
    
    return {
      allowed: false,
      remaining: 0,
      total_available: totalAvailable,
      reason: `You've used all ${totalAvailable} fact checks this month. ${upgradeMessage}`
    };
  }
  
  return { 
    allowed: false, 
    remaining: 0,
    total_available: 0,
    reason: 'Unknown event type'
  };
}

/**
 * Records a usage event and updates the period
 */
export async function recordUsage(
  userId: string,
  tier: UsageTier,
  eventType: 'fact_check' | 'analysis_run',
  details: {
    inputType: 'url' | 'text' | 'claim' | 'video' | 'thread';
    inputHash: string;
    costEstimate: number;
    apisCalled: string[];
    claimsExtracted: number;
    evidenceRetrieved: number;
    usedCache: boolean;
    processingTimeMs: number;
  }
): Promise<void> {
  const now = new Date();
  
  // Create usage event
  const event: UsageEvent = {
    id: `evt_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    event_type: eventType,
    input_type: details.inputType,
    input_hash: details.inputHash,
    cost_estimate: details.costEstimate,
    apis_called: details.apisCalled,
    claims_extracted: details.claimsExtracted,
    evidence_retrieved: details.evidenceRetrieved,
    used_cache: details.usedCache,
    timestamp: now,
    processing_time_ms: details.processingTimeMs,
  };
  
  usageEvents.push(event);
  
  // Update usage period
  const period = await getCurrentUsagePeriod(userId, tier);
  
  if (eventType === 'fact_check') {
    period.fact_checks_used++;
    period.estimated_cost += details.costEstimate;
  } else {
    period.analysis_runs_used++;
  }
  
  period.updated_at = now;
}

/**
 * Gets usage summary for a user
 */
export async function getUsageSummary(userId: string, tier: UsageTier): Promise<{
  period: UsagePeriod;
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
}> {
  const period = await getCurrentUsagePeriod(userId, tier);
  
  const totalAvailable = period.fact_checks_limit + period.fact_checks_rollover;
  const remaining = totalAvailable - period.fact_checks_used;
  const percentage = (period.fact_checks_used / totalAvailable) * 100;
  
  const avgCost = period.fact_checks_used > 0 
    ? period.estimated_cost / period.fact_checks_used 
    : 0;
  
  return {
    period,
    fact_checks: {
      used: period.fact_checks_used,
      limit: period.fact_checks_limit,
      rollover: period.fact_checks_rollover,
      remaining: Math.max(0, remaining),
      percentage: Math.min(100, percentage),
    },
    analysis_runs: {
      used: period.analysis_runs_used,
        unlimited: tier === 'pro' || tier === 'creator' || tier === 'organization',
    },
    cost: {
      estimated_this_period: period.estimated_cost,
      average_per_check: avgCost,
    },
    resets_at: period.period_end,
  };
}

/**
 * Calculates estimated cost for an analysis
 */
export function calculateAnalysisCost(result: {
  claims: Array<{ evidence: unknown[] }>;
}): number {
  const searchCost = result.claims.length * 0.005;  // $0.005 per search
  const llmCost = 0.15;  // Average LLM cost per analysis
  return searchCost + llmCost;
}

/**
 * Gets recent usage events for a user
 */
export function getRecentEvents(
  userId: string, 
  limit: number = 10
): UsageEvent[] {
  return usageEvents
    .filter(e => e.user_id === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Admin function: Get usage across all users
 */
export function getGlobalUsageStats(): {
  total_users: number;
  by_tier: Record<UsageTier, {
    users: number;
    fact_checks: number;
    analysis_runs: number;
    total_cost: number;
  }>;
  cache_effectiveness: {
    total_cached_uses: number;
    cache_hit_rate: number;
  };
} {
  const usersByTier: Record<UsageTier, Set<string>> = {
    free: new Set(),
    pro: new Set(),
    creator: new Set(),
    organization: new Set(),
  };
  
  const statsByTier: Record<UsageTier, {
    users: number;
    fact_checks: number;
    analysis_runs: number;
    total_cost: number;
  }> = {
    free: { users: 0, fact_checks: 0, analysis_runs: 0, total_cost: 0 },
    pro: { users: 0, fact_checks: 0, analysis_runs: 0, total_cost: 0 },
    creator: { users: 0, fact_checks: 0, analysis_runs: 0, total_cost: 0 },
    organization: { users: 0, fact_checks: 0, analysis_runs: 0, total_cost: 0 },
  };
  
  for (const period of usagePeriods.values()) {
    usersByTier[period.tier].add(period.user_id);
    statsByTier[period.tier].fact_checks += period.fact_checks_used;
    statsByTier[period.tier].analysis_runs += period.analysis_runs_used;
    statsByTier[period.tier].total_cost += period.estimated_cost;
  }
  
  statsByTier.free.users = usersByTier.free.size;
  statsByTier.pro.users = usersByTier.pro.size;
  statsByTier.creator.users = usersByTier.creator.size;
  
  const totalCachedUses = usageEvents.filter(e => e.used_cache).length;
  const cacheHitRate = usageEvents.length > 0 
    ? (totalCachedUses / usageEvents.length) * 100 
    : 0;
  
  return {
    total_users: usersByTier.free.size + usersByTier.pro.size + usersByTier.creator.size,
    by_tier: statsByTier,
    cache_effectiveness: {
      total_cached_uses: totalCachedUses,
      cache_hit_rate: cacheHitRate,
    },
  };
}
