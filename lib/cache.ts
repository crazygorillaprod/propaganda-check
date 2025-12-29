import crypto from 'crypto';
import type { CachedAnalysis, AnalysisResult } from './types';

/**
 * Cache utilities for analysis results
 * 
 * Core principle: Cache aggressively to avoid redundant API calls
 * and protect user quotas.
 */

// In-memory cache (replace with Redis/DB in production)
const cache = new Map<string, CachedAnalysis>();

/**
 * Generates a stable hash for input content
 * 
 * @param inputType - Type of input (url, text, claim)
 * @param content - The actual content
 * @param timestamp - Optional timestamp for time-sensitive content
 */
export function generateInputHash(
  inputType: 'url' | 'text' | 'claim',
  content: string,
  timestamp?: Date
): string {
  let normalizedContent = content.trim().toLowerCase();
  
  if (inputType === 'url') {
    try {
      const url = new URL(content);
      // Remove tracking params that don't affect content
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'msclkid', '_ga', 'mc_cid', 'mc_eid'
      ];
      trackingParams.forEach(param => url.searchParams.delete(param));
      normalizedContent = url.toString();
    } catch (e) {
      // Not a valid URL, use as-is
    }
  }
  
  // Include date bucket for time-sensitive content (news)
  const dateBucket = timestamp 
    ? timestamp.toISOString().split('T')[0]  // YYYY-MM-DD
    : new Date().toISOString().split('T')[0];
  
  return crypto
    .createHash('sha256')
    .update(`${inputType}:${normalizedContent}:${dateBucket}`)
    .digest('hex');
}

/**
 * Gets cache duration in milliseconds based on input type
 * Aggressive caching to reduce costs by 50%+
 */
export function getCacheDuration(inputType: 'url' | 'text' | 'claim'): number {
  switch (inputType) {
    case 'url':
      return 7 * 24 * 60 * 60 * 1000;  // 7 days (was 24h) - URLs rarely change
    case 'text':
      return 14 * 24 * 60 * 60 * 1000;  // 14 days (was 7d) - Text is immutable
    case 'claim':
      return 30 * 24 * 60 * 60 * 1000;  // 30 days - Claims don't change
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Looks up cached analysis by hash
 * Returns null if not found or expired
 */
export async function lookupCache(
  inputHash: string
): Promise<CachedAnalysis | null> {
  const cached = cache.get(inputHash);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (new Date() > cached.expires_at) {
    cache.delete(inputHash);
    return null;
  }
  
  // Update access metadata
  cached.access_count++;
  cached.last_accessed = new Date();
  
  return cached;
}

/**
 * Stores analysis result in cache
 */
export async function cacheAnalysis(
  inputHash: string,
  inputType: 'url' | 'text' | 'claim',
  inputContent: string,
  analysisResult: AnalysisResult,
  originalCost: number
): Promise<void> {
  const now = new Date();
  const duration = getCacheDuration(inputType);
  
  const cached: CachedAnalysis = {
    input_hash: inputHash,
    input_type: inputType,
    input_content: inputContent,
    created_at: now,
    expires_at: new Date(now.getTime() + duration),
    access_count: 1,
    last_accessed: now,
    analysis_result: analysisResult,
    original_cost: originalCost,
  };
  
  cache.set(inputHash, cached);
}

/**
 * Clears expired cache entries
 * Should be run periodically (e.g., daily cron job)
 */
export function clearExpiredCache(): number {
  const now = new Date();
  let cleared = 0;
  
  for (const [hash, entry] of cache.entries()) {
    if (now > entry.expires_at) {
      cache.delete(hash);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): {
  total_entries: number;
  total_hits: number;
  estimated_cost_saved: number;
} {
  let totalHits = 0;
  let totalCostSaved = 0;
  
  for (const entry of cache.values()) {
    // Subtract 1 because first access is the original query
    const additionalHits = entry.access_count - 1;
    totalHits += additionalHits;
    totalCostSaved += additionalHits * entry.original_cost;
  }
  
  return {
    total_entries: cache.size,
    total_hits: totalHits,
    estimated_cost_saved: totalCostSaved,
  };
}

/**
 * Forces a cache refresh (invalidates existing entry)
 */
export function invalidateCache(inputHash: string): boolean {
  return cache.delete(inputHash);
}
