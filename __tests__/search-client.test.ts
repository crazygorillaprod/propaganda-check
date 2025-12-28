import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import {
  getSearchClient,
  build_queries_for_claim,
  is_reputable_source,
  is_bad_citation,
  filter_to_reputable,
  retrieve_evidence_for_claim,
  type SearchResult,
} from '../lib/search-client';

describe('Search Client', () => {
  describe('build_queries_for_claim', () => {
    test('should generate multiple search queries for a claim', () => {
      const claim = 'Inflation rose to 8.5 percent in March 2024';
      const queries = build_queries_for_claim(claim);

      expect(queries.length).toBeGreaterThan(0);
      expect(queries.length).toBeLessThanOrEqual(3);
      expect(queries[0]).toBe(claim); // First query is always the full claim
    });

    test('should extract numbers for focused search', () => {
      const claim = 'unemployment dropped to 3.7%';
      const queries = build_queries_for_claim(claim);

      expect(queries.some(q => q.includes('3.7'))).toBe(true);
    });

    test('should extract proper nouns', () => {
      const claim = 'President Biden announced new policies';
      const queries = build_queries_for_claim(claim);

      expect(queries.some(q => q.includes('Biden'))).toBe(true);
    });

    test('should handle claims without special features', () => {
      const claim = 'prices are rising';
      const queries = build_queries_for_claim(claim);

      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0]).toBe(claim);
    });
  });

  describe('is_reputable_source', () => {
    test('should recognize major news agencies', () => {
      expect(is_reputable_source('https://reuters.com/article/test')).toBe(true);
      expect(is_reputable_source('https://apnews.com/article/123')).toBe(true);
      expect(is_reputable_source('https://bbc.com/news/world')).toBe(true);
    });

    test('should recognize government domains', () => {
      expect(is_reputable_source('https://cdc.gov/data/report')).toBe(true);
      expect(is_reputable_source('https://state.gov/press')).toBe(true);
      expect(is_reputable_source('https://data.gov.uk/statistics')).toBe(true);
    });

    test('should recognize academic domains', () => {
      expect(is_reputable_source('https://stanford.edu/research')).toBe(true);
      expect(is_reputable_source('https://nature.com/articles/123')).toBe(true);
    });

    test('should recognize major newspapers', () => {
      expect(is_reputable_source('https://nytimes.com/2024/article')).toBe(true);
      expect(is_reputable_source('https://washingtonpost.com/politics')).toBe(true);
      expect(is_reputable_source('https://theguardian.com/world/news')).toBe(true);
    });

    test('should reject non-reputable sources', () => {
      expect(is_reputable_source('https://random-blog.com/post')).toBe(false);
      expect(is_reputable_source('https://fake-news-site.net/story')).toBe(false);
      expect(is_reputable_source('https://twitter.com/user/status')).toBe(false);
    });

    test('should handle invalid URLs gracefully', () => {
      expect(is_reputable_source('not-a-url')).toBe(false);
      expect(is_reputable_source('')).toBe(false);
    });
  });

  describe('is_bad_citation', () => {
    test('should detect homepage URLs', () => {
      expect(is_bad_citation('https://example.com/')).toBe(true);
      expect(is_bad_citation('https://example.com')).toBe(true);
    });

    test('should detect terms/privacy pages', () => {
      expect(is_bad_citation('https://example.com/terms')).toBe(true);
      expect(is_bad_citation('https://example.com/privacy')).toBe(true);
      expect(is_bad_citation('https://example.com/about')).toBe(true);
    });

    test('should detect AP hub pages', () => {
      expect(is_bad_citation('https://apnews.com/hub/politics')).toBe(true);
      expect(is_bad_citation('https://apnews.com/hub/world-news')).toBe(true);
    });

    test('should detect shallow category pages', () => {
      expect(is_bad_citation('https://example.com/politics')).toBe(true);
      expect(is_bad_citation('https://example.com/news')).toBe(true);
    });

    test('should allow proper article URLs', () => {
      expect(is_bad_citation('https://reuters.com/world/article-title-123')).toBe(false);
      expect(is_bad_citation('https://nytimes.com/2024/12/28/politics/article')).toBe(false);
    });

    test('should handle invalid URLs', () => {
      expect(is_bad_citation('not-a-url')).toBe(true);
    });
  });

  describe('filter_to_reputable', () => {
    test('should filter out non-reputable sources', () => {
      const results: SearchResult[] = [
        { title: 'Reuters Article', url: 'https://reuters.com/article/123', snippet: 'Test' },
        { title: 'Random Blog', url: 'https://random-blog.com/post', snippet: 'Test' },
        { title: 'BBC News', url: 'https://bbc.com/news/article', snippet: 'Test' },
        { title: 'Spam Site', url: 'https://spam.com/click', snippet: 'Test' },
      ];

      const filtered = filter_to_reputable(results);

      expect(filtered.length).toBe(2);
      expect(filtered[0].url).toContain('reuters.com');
      expect(filtered[1].url).toContain('bbc.com');
    });

    test('should return empty array when no reputable sources', () => {
      const results: SearchResult[] = [
        { title: 'Blog Post', url: 'https://blog.example.com/post', snippet: 'Test' },
        { title: 'Forum', url: 'https://forum.example.com/thread', snippet: 'Test' },
      ];

      const filtered = filter_to_reputable(results);

      expect(filtered.length).toBe(0);
    });
  });

  describe('Search Client Integration', () => {
    test('should create a search client', () => {
      const client = getSearchClient();
      expect(client).toBeDefined();
      expect(typeof client.search).toBe('function');
      expect(typeof client.isAvailable).toBe('function');
    });

    test('should indicate availability based on API key', () => {
      const client = getSearchClient();
      const available = client.isAvailable();
      
      // Should be boolean
      expect(typeof available).toBe('boolean');
      
      // If Brave key is set, should be true; otherwise false
      const hasBraveKey = !!process.env.BRAVE_SEARCH_API_KEY;
      expect(available).toBe(hasBraveKey);
    });

    test('stub backend should return empty results', async () => {
      // Save original env
      const originalKey = process.env.BRAVE_SEARCH_API_KEY;
      
      // Temporarily remove key to force stub
      delete process.env.BRAVE_SEARCH_API_KEY;
      
      // Create new client instance (will be stub)
      const { createSearchClient } = await import('../lib/search-client');
      const stubClient = createSearchClient();
      
      expect(stubClient.isAvailable()).toBe(false);
      
      const response = await stubClient.search('test query', [], 5);
      
      expect(response.results).toEqual([]);
      expect(response.backend).toBe('stub');
      expect(response.query).toBe('test query');
      
      // Restore env
      if (originalKey) {
        process.env.BRAVE_SEARCH_API_KEY = originalKey;
      }
    });

    test('should handle domain exclusions', async () => {
      const client = getSearchClient();
      
      const response = await client.search(
        'climate change',
        ['wikipedia.org', 'twitter.com'],
        5
      );
      
      // Should return empty results (stub backend)
      expect(response.results).toHaveLength(0);
      expect(response.backend).toBeDefined();
      expect(response.query).toBe('climate change');
    });
  });

  describe('retrieve_evidence_for_claim', () => {
    test('should retrieve and filter evidence', async () => {
      const claim = 'inflation statistics';
      
      const results = await retrieve_evidence_for_claim(claim, []);
      
      // Should return an array (may be empty if no API key or no results)
      expect(Array.isArray(results)).toBe(true);
      
      // All results should be reputable
      for (const result of results) {
        expect(is_reputable_source(result.url)).toBe(true);
      }
      
      // Should not have bad citations
      for (const result of results) {
        expect(is_bad_citation(result.url)).toBe(false);
      }
    });

    test('should deduplicate by domain', async () => {
      const claim = 'economic data';
      
      const results = await retrieve_evidence_for_claim(claim, []);
      
      // Extract domains
      const domains = results.map(r => {
        try {
          return new URL(r.url).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      }).filter(Boolean);
      
      // Should have unique domains
      const uniqueDomains = new Set(domains);
      expect(uniqueDomains.size).toBe(domains.length);
    });

    test('should exclude specified domains', async () => {
      const claim = 'news update';
      const excluded = ['example.com', 'test.org'];
      
      const results = await retrieve_evidence_for_claim(claim, excluded);
      
      // No result should be from excluded domains
      for (const result of results) {
        const hostname = new URL(result.url).hostname.replace(/^www\./, '');
        expect(excluded).not.toContain(hostname);
      }
    });

    test('should return limited results', async () => {
      const claim = 'breaking news';
      
      const results = await retrieve_evidence_for_claim(claim, []);
      
      // Should limit to reasonable number (6 max)
      expect(results.length).toBeLessThanOrEqual(6);
    });

    test('should handle search disabled gracefully', async () => {
      // This test ensures the function doesn't crash when search is disabled
      const originalKey = process.env.BRAVE_SEARCH_API_KEY;
      delete process.env.BRAVE_SEARCH_API_KEY;
      
      // Force recreation of client
      const { retrieve_evidence_for_claim: retrieveEvidence } = await import('../lib/search-client');
      
      const results = await retrieveEvidence('test claim', []);
      
      // Should return empty array, not throw
      expect(results).toEqual([]);
      
      // Restore
      if (originalKey) {
        process.env.BRAVE_SEARCH_API_KEY = originalKey;
      }
    });
  });
});
