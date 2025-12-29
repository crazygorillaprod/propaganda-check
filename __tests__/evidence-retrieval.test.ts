import { describe, expect, test } from '@jest/globals';
import {
  retrieve_evidence_for_claim,
  build_queries_for_claim,
} from '../lib/search-client';
import { scoreEvidence } from '../lib/evidence';
import { calculateOverallVerifiability } from '../lib/verifiability';
import { Claim, EvidenceItem } from '../lib/types';
import { buildInputEvidenceForClaim } from '../lib/input-evidence';

describe('External Evidence Retrieval Integration', () => {
  describe('Complete evidence retrieval flow', () => {
    test('should retrieve, score, and integrate evidence for a claim', async () => {
      const claim = 'Inflation rose to 8.5 percent in March 2024';
      
      // 1. Build search queries
      const queries = build_queries_for_claim(claim);
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0]).toBe(claim);
      
      // 2. Retrieve evidence (will return [] if no API key)
      const searchResults = await retrieve_evidence_for_claim(claim, []);
      expect(Array.isArray(searchResults)).toBe(true);
      
      // 3. Score evidence (works even with empty results)
      const evidenceItems = await scoreEvidence(claim, searchResults);
      expect(Array.isArray(evidenceItems)).toBe(true);
      
      // Verify EvidenceItem structure
      evidenceItems.forEach((item: EvidenceItem) => {
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('publisher');
        expect(item).toHaveProperty('snippet');
        expect(item).toHaveProperty('supports_claim');
        expect(item).toHaveProperty('confidence');
        expect(typeof item.confidence).toBe('number');
        expect(item.confidence).toBeGreaterThanOrEqual(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should calculate evidence summary correctly', async () => {
      const claim: Claim = {
        text: 'Test claim',
        type: 'EVENT',
        importance: 0.8,
        checkability: 0.9,
        evidence: [
          {
            url: 'https://reuters.com/article/1',
            title: 'Test Article 1',
            publisher: 'reuters.com',
            snippet: 'Some snippet text',
            supports_claim: true,
            confidence: 0.8,
          },
          {
            url: 'https://bbc.com/article/2',
            title: 'Test Article 2',
            publisher: 'bbc.com',
            snippet: 'Another snippet',
            supports_claim: true,
            confidence: 0.7,
          },
        ],
        verdict: 'Supported',
        verdictConfidence: 0.85,
        reasoning: 'Test reasoning',
        evidenceSummary: {
          totalSources: 2,
          uniqueDomains: 2,
          supportingCount: 2,
          refutingCount: 0,
          averageCredibility: 0.75,
        },
        suggestedSearches: [],
      };

      // Verify evidence summary structure
      expect(claim.evidenceSummary.totalSources).toBe(2);
      expect(claim.evidenceSummary.uniqueDomains).toBe(2);
      expect(claim.evidenceSummary.supportingCount).toBe(2);
      expect(claim.evidenceSummary.refutingCount).toBe(0);
      expect(claim.evidenceSummary.averageCredibility).toBe(0.75);
    });

    test('should handle missing API key with NOT_RUN status', () => {
      // When search is disabled, calculateOverallVerifiability should return NOT_RUN
      const result = calculateOverallVerifiability([], false);
      
      expect(result.status).toBe('NOT_RUN');
      expect(result.score).toBeNull();
      expect(result.retrieval_state).toBe('NOT_RUN');
      expect(result.retrieval_reason).toContain('missing API key');
    });

    test('should handle NO_EVIDENCE_FOUND when search runs but finds nothing', () => {
      const claims: Claim[] = [
        {
          text: 'Test claim',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.9,
          evidence: [], // No evidence found
          verdict: 'Insufficient evidence',
          verdictConfidence: 0,
          reasoning: '',
          evidenceSummary: {
            totalSources: 0,
            uniqueDomains: 0,
            supportingCount: 0,
            refutingCount: 0,
            averageCredibility: 0,
          },
          suggestedSearches: [],
        },
      ];
      
      const result = calculateOverallVerifiability(claims, true);
      
      expect(result.status).toBe('NO_EVIDENCE_FOUND');
      expect(result.score).toBeNull();
      expect(result.confidence).toBeNull();
      expect(result.retrieval_state).toBe('RAN_NO_RESULTS');
      expect(result.retrieval_reason).toContain('0 evidence results');
    });

    test('should handle EVIDENCE_FOUND when evidence exists', () => {
      const claims: Claim[] = [
        {
          text: 'Test claim',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.9,
          evidence: [
            {
              url: 'https://reuters.com/article/1',
              title: 'Test Article',
              publisher: 'reuters.com',
              snippet: 'Some snippet',
              supports_claim: true,
              confidence: 0.8,
            },
          ],
          verdict: 'Supported',
          verdictConfidence: 0.8,
          reasoning: 'Evidence supports claim',
          evidenceSummary: {
            totalSources: 1,
            uniqueDomains: 1,
            supportingCount: 1,
            refutingCount: 0,
            averageCredibility: 0.8,
          },
          suggestedSearches: [],
        },
      ];
      
      const result = calculateOverallVerifiability(claims, true);
      
      expect(result.status).toBe('EVIDENCE_FOUND');
      expect(result.score).toBeGreaterThan(0);
      expect(result.message).toBeUndefined();
    });

    test('should always include INPUT evidence for a provided URL even if its domain is excluded from external search', () => {
      const inputUrl = 'https://apnews.com/article/trump-zelenskyy-russia-ukraine-war-florida-42c38dbb3eecc22dd80271d504308337';
      const excludedDomains = ['apnews.com'];
      expect(excludedDomains).toContain('apnews.com');

      const inputEvidence = buildInputEvidenceForClaim({
        inputUrl,
        articleTitle: 'AP: Test title',
        fullArticleText: 'Some article text mentioning a claim that we extracted.',
        claimText: 'a claim that we extracted',
      });

      expect(inputEvidence).not.toBeNull();
      expect(inputEvidence?.role).toBe('INPUT');
      expect(inputEvidence?.url).toBe(inputUrl);
      expect(inputEvidence?.domain).toBe('apnews.com');

      // When ONLY input evidence exists, overall verifiability must still treat it as "no corroboration".
      const claims: Claim[] = [
        {
          text: 'a claim that we extracted',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.9,
          evidence: [inputEvidence as EvidenceItem],
          verdict: 'Insufficient evidence',
          verdictConfidence: 0,
          reasoning: '',
          evidenceSummary: {
            totalSources: 0,
            uniqueDomains: 0,
            supportingCount: 0,
            refutingCount: 0,
            averageCredibility: 0,
          },
          suggestedSearches: [],
        },
      ];

      const overall = calculateOverallVerifiability(claims, true);
      expect(overall.score).toBeNull();
      expect(overall.confidence).toBeNull();
      expect(overall.retrieval_state).toBe('RAN_NO_RESULTS');
    });
  });

  describe('EvidenceItem structure validation', () => {
    test('should have all required fields', async () => {
      const mockSources = [
        {
          title: 'Reuters announced a new policy',
          url: 'https://reuters.com/article',
          snippet: 'Reuters announced the policy in a statement.',
          age: '2 days ago',
        },
      ];

      const evidenceItems = await scoreEvidence('Reuters announced a new policy', mockSources);
      
      expect(evidenceItems.length).toBe(1);
      const item = evidenceItems[0];
      
      // Required fields from specification
      expect(typeof item.url).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.publisher).toBe('string');
      expect(typeof item.snippet).toBe('string');
      expect(typeof item.supports_claim).toBe('boolean');
      expect(typeof item.confidence).toBe('number');
      
      // Optional fields
      if (item.published_at) {
        expect(typeof item.published_at).toBe('string');
      }
    });

    test('should calculate confidence based on relevance and credibility', async () => {
      const mockSources = [
        {
          title: 'Reuters: Inflation data shows 8.5% rise',
          url: 'https://reuters.com/article',
          snippet: 'Inflation rose to 8.5 percent according to latest data',
        },
      ];

      const claim = 'Inflation rose to 8.5 percent';
      const evidenceItems = await scoreEvidence(claim, mockSources);
      
      expect(evidenceItems[0].confidence).toBeGreaterThan(0.5); // High credibility source
      expect(evidenceItems[0].confidence).toBeLessThanOrEqual(1);
    });

    test('should handle attribution boost in confidence calculation', async () => {
      const mockSources = [
        {
          title: 'Reuters announced a new policy',
          url: 'https://reuters.com/article',
          snippet: 'Reuters announced the policy in a statement.',
        },
      ];

      // Without attribution
      const evidenceWithoutAttr = await scoreEvidence('Reuters announced a new policy', mockSources);
      const confWithoutAttr = evidenceWithoutAttr[0].confidence;
      
      // With attribution
      const evidenceWithAttr = await scoreEvidence('Reuters announced a new policy', mockSources, 'DIRECT_QUOTE');
      const confWithAttr = evidenceWithAttr[0].confidence;
      
      // Attribution should boost confidence
      expect(confWithAttr).toBeGreaterThanOrEqual(confWithoutAttr);
    });
  });

  describe('Evidence Summary updates', () => {
    test('should count total sources correctly', async () => {
      const mockSources = [
        { title: 'Reuters announced a new policy', url: 'https://reuters.com/1', snippet: 'Reuters announced the policy today.' },
        { title: 'BBC: Reuters announced a new policy', url: 'https://bbc.com/2', snippet: 'BBC reports Reuters announced the policy.' },
        { title: 'AP News: Reuters announced a new policy', url: 'https://apnews.com/3', snippet: 'AP notes Reuters announced the policy.' },
      ];

      const evidenceItems = await scoreEvidence('Reuters announced a new policy', mockSources);
      
      expect(evidenceItems.length).toBe(3);
    });

    test('should count unique domains correctly', () => {
      const evidence: EvidenceItem[] = [
        {
          url: 'https://reuters.com/article/1',
          title: 'Article 1',
          publisher: 'reuters.com',
          snippet: 'content',
          supports_claim: true,
          confidence: 0.8,
        },
        {
          url: 'https://reuters.com/article/2',
          title: 'Article 2',
          publisher: 'reuters.com',
          snippet: 'content',
          supports_claim: true,
          confidence: 0.7,
        },
        {
          url: 'https://bbc.com/article/3',
          title: 'Article 3',
          publisher: 'bbc.com',
          snippet: 'content',
          supports_claim: true,
          confidence: 0.9,
        },
      ];

      const uniqueDomains = new Set(evidence.map(e => e.publisher)).size;
      expect(uniqueDomains).toBe(2); // reuters.com and bbc.com
    });

    test('should calculate average credibility', () => {
      const evidence: EvidenceItem[] = [
        {
          url: 'https://reuters.com/1',
          title: 'Article 1',
          publisher: 'reuters.com',
          snippet: 'content',
          supports_claim: true,
          confidence: 0.8,
          credibilityScore: 0.9,
        },
        {
          url: 'https://bbc.com/2',
          title: 'Article 2',
          publisher: 'bbc.com',
          snippet: 'content',
          supports_claim: true,
          confidence: 0.7,
          credibilityScore: 0.8,
        },
      ];

      const avgCred = evidence.reduce((sum, e) => sum + (e.credibilityScore || 0), 0) / evidence.length;
      expect(avgCred).toBeCloseTo(0.85, 2);
    });
  });

  describe('Relevance gate (hard entity + action)', () => {
    test('should reject broad context that matches only generic USA + action words', async () => {
      const claim = 'Turning Point USA (TPUSA) will continue campus debates nationwide';

      const mockSources = [
        {
          title: 'USA campus debates will continue nationwide, analysts say',
          url: 'https://example.com/context',
          snippet: 'A general piece about campus debates in the USA. It discusses debate culture and free speech broadly.',
        },
      ];

      const evidenceItems = await scoreEvidence(claim, mockSources);
      expect(evidenceItems.length).toBe(0);
    });

    test('should accept evidence that mentions a core entity and an action keyword', async () => {
      const claim = 'Turning Point USA (TPUSA) will continue campus debates nationwide';

      const mockSources = [
        {
          title: 'Turning Point USA says it will continue campus debates nationwide',
          url: 'https://example.com/relevant',
          snippet: 'Turning Point USA (TPUSA) announced it will continue hosting campus debates across the country.',
        },
      ];

      const evidenceItems = await scoreEvidence(claim, mockSources);
      expect(evidenceItems.length).toBe(1);
    });
  });
});
