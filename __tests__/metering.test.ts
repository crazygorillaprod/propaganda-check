/**
 * Unit tests for metering system
 * Run with: npx jest lib/__tests__/metering.test.ts
 */

import {
  getFactCheckLimit,
  checkQuota,
  recordUsage,
  getCurrentUsagePeriod,
  getUsageSummary,
  calculateAnalysisCost,
} from '../lib/metering';

import {
  generateInputHash,
  lookupCache,
  cacheAnalysis,
  getCacheStats,
} from '../lib/cache';

import type { UsageTier, AnalysisResult } from '../lib/types';

describe('Metering System', () => {
  describe('Tier Limits', () => {
    it('should return correct limits for each tier', () => {
      expect(getFactCheckLimit('free')).toBe(10);
      expect(getFactCheckLimit('pro')).toBe(50);
      expect(getFactCheckLimit('creator')).toBe(300);
      expect(getFactCheckLimit('organization')).toBe(1000);
    });
  });

  describe('Quota Checking', () => {
    it('should allow fact checks when under quota', async () => {
      const result = await checkQuota('test_user_1', 'free', 'fact_check');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('should allow unlimited analysis runs for pro tier', async () => {
      const result = await checkQuota('test_user_2', 'pro', 'analysis_run');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should deny analysis runs for free tier', async () => {
      const result = await checkQuota('test_user_3', 'free', 'analysis_run');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Upgrade to Pro');
    });
  });

  describe('Usage Recording', () => {
    it('should record fact check usage', async () => {
      const userId = 'test_user_4';
      const tier: UsageTier = 'free';

      const beforePeriod = await getCurrentUsagePeriod(userId, tier);
      const usedBefore = beforePeriod.fact_checks_used;

      await recordUsage(userId, tier, 'fact_check', {
        inputType: 'text',
        inputHash: 'test_hash',
        costEstimate: 0.22,
        apisCalled: ['brave-search', 'openai'],
        claimsExtracted: 3,
        evidenceRetrieved: 5,
        usedCache: false,
        processingTimeMs: 1500,
      });

      const afterPeriod = await getCurrentUsagePeriod(userId, tier);
      expect(afterPeriod.fact_checks_used).toBe(usedBefore + 1);
      expect(afterPeriod.estimated_cost).toBeCloseTo(0.22, 2);
    });
  });

  describe('Usage Summary', () => {
    it('should provide complete usage summary', async () => {
      const summary = await getUsageSummary('test_user_5', 'pro');

      expect(summary).toHaveProperty('fact_checks');
      expect(summary).toHaveProperty('analysis_runs');
      expect(summary).toHaveProperty('cost');
      expect(summary).toHaveProperty('resets_at');

      expect(summary.fact_checks.limit).toBe(50);
      expect(summary.analysis_runs.unlimited).toBe(true);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate analysis cost based on claims', () => {
      const mockResult = {
        claims: [
          { evidence: [{}, {}] },
          { evidence: [{}] },
          { evidence: [{}, {}, {}] },
        ],
      };

      const cost = calculateAnalysisCost(mockResult as any);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeCloseTo(0.165, 2); // 3 * 0.005 + 0.15
    });
  });
});

describe('Cache System', () => {
  describe('Hash Generation', () => {
    it('should generate stable hashes', () => {
      const hash1 = generateInputHash('text', 'Test claim', new Date('2025-01-01'));
      const hash2 = generateInputHash('text', 'Test claim', new Date('2025-01-01'));
      expect(hash1).toBe(hash2);
    });

    it('should strip tracking params from URLs', () => {
      const url1 = 'https://example.com/article?utm_source=twitter&fbclid=123';
      const url2 = 'https://example.com/article';

      const hash1 = generateInputHash('url', url1);
      const hash2 = generateInputHash('url', url2);

      // Should be similar (tracking params removed)
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });

    it('should use date buckets for time-sensitive content', () => {
      const content = 'Breaking news';
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');

      const hash1 = generateInputHash('text', content, date1);
      const hash2 = generateInputHash('text', content, date2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve analysis', async () => {
      const hash = 'test_cache_hash_1';
      const mockAnalysis: AnalysisResult = {
        article_meta: {},
        claims: [],
        overall_score: {
          score: 75,
          confidence: 0.8,
          breakdown: {
            attribution: 20,
            corroboration_1: 25,
            corroboration_2plus: 15,
            specificity: 15,
          },
        },
        tactics: {
          score_0_to_100: 30,
          flags: ['test-flag'],
          explanation: 'Test',
        },
      };

      await cacheAnalysis(hash, 'text', 'test content', mockAnalysis, 0.22);

      const cached = await lookupCache(hash);
      expect(cached).toBeTruthy();
      expect(cached?.analysis_result.overall_score.score).toBe(75);
      expect(cached?.original_cost).toBe(0.22);
    });

    it('should return null for cache miss', async () => {
      const cached = await lookupCache('nonexistent_hash');
      expect(cached).toBeNull();
    });

    it('should track cache access count', async () => {
      const hash = 'test_cache_hash_2';
      const mockAnalysis: AnalysisResult = {
        article_meta: {},
        claims: [],
        overall_score: {
          score: 75,
          confidence: 0.8,
          breakdown: {
            attribution: 20,
            corroboration_1: 25,
            corroboration_2plus: 15,
            specificity: 15,
          },
        },
        tactics: {
          score_0_to_100: 30,
          flags: [],
          explanation: 'Test',
        },
      };

      await cacheAnalysis(hash, 'text', 'test', mockAnalysis, 0.22);

      const firstCount = (await lookupCache(hash))?.access_count ?? 0;
      const secondCount = (await lookupCache(hash))?.access_count ?? 0;

      expect(secondCount).toBeGreaterThan(firstCount);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', () => {
      const stats = getCacheStats();
      
      expect(stats).toHaveProperty('total_entries');
      expect(stats).toHaveProperty('total_hits');
      expect(stats).toHaveProperty('estimated_cost_saved');

      expect(typeof stats.total_entries).toBe('number');
      expect(typeof stats.total_hits).toBe('number');
      expect(typeof stats.estimated_cost_saved).toBe('number');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete metering flow', async () => {
    const userId = 'integration_test_user';
    const tier: UsageTier = 'free';
    const inputHash = generateInputHash('text', 'Integration test claim');

    // 1. Check initial quota
    const quotaBefore = await checkQuota(userId, tier, 'fact_check');
    expect(quotaBefore.allowed).toBe(true);
    const remainingBefore = quotaBefore.remaining;

    // 2. Record usage
    await recordUsage(userId, tier, 'fact_check', {
      inputType: 'text',
      inputHash,
      costEstimate: 0.22,
      apisCalled: ['openai'],
      claimsExtracted: 2,
      evidenceRetrieved: 4,
      usedCache: false,
      processingTimeMs: 1000,
    });

    // 3. Check quota after
    const quotaAfter = await checkQuota(userId, tier, 'fact_check');
    expect(quotaAfter.remaining).toBe(remainingBefore - 1);

    // 4. Get usage summary
    const summary = await getUsageSummary(userId, tier);
    expect(summary.fact_checks.used).toBeGreaterThan(0);
    expect(summary.cost.estimated_this_period).toBeCloseTo(0.22, 2);
  });

  it('should handle quota exhaustion', async () => {
    const userId = 'quota_test_user';
    const tier: UsageTier = 'free';

    // Use up all checks
    for (let i = 0; i < 11; i++) {
      await recordUsage(userId, tier, 'fact_check', {
        inputType: 'text',
        inputHash: `hash_${i}`,
        costEstimate: 0.22,
        apisCalled: ['openai'],
        claimsExtracted: 1,
        evidenceRetrieved: 2,
        usedCache: false,
        processingTimeMs: 1000,
      });
    }

    // Should be denied
    const quota = await checkQuota(userId, tier, 'fact_check');
    expect(quota.allowed).toBe(false);
    expect(quota.reason).toContain("You've used all");
  });
});
