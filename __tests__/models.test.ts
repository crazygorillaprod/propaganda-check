import { describe, expect, test } from '@jest/globals';
import type { ArticleMeta, EvidenceItem, Claim, ClaimType, AnalysisResult } from '../lib/types';

describe('Data Models', () => {
  describe('ArticleMeta', () => {
    test('should have required new fields', () => {
      const meta: ArticleMeta = {
        publisher: 'example.com',
        author: 'John Doe',
        published_at: '2025-12-28',
        canonical_url: 'https://example.com/article',
      };

      expect(meta.publisher).toBe('example.com');
      expect(meta.author).toBe('John Doe');
      expect(meta.published_at).toBe('2025-12-28');
      expect(meta.canonical_url).toBe('https://example.com/article');
    });

    test('should support legacy fields', () => {
      const meta: ArticleMeta = {
        url: 'https://example.com/article',
        domain: 'example.com',
        sourceType: 'news',
      };

      expect(meta.url).toBe('https://example.com/article');
      expect(meta.domain).toBe('example.com');
      expect(meta.sourceType).toBe('news');
    });
  });

  describe('EvidenceItem', () => {
    test('should have required new fields', () => {
      const evidence: EvidenceItem = {
        url: 'https://source.com/page',
        title: 'Test Source',
        publisher: 'source.com',
        published_at: '2025-12-27',
        snippet: 'Test snippet',
        supports_claim: true,
        confidence: 0.85,
      };

      expect(evidence.url).toBe('https://source.com/page');
      expect(evidence.title).toBe('Test Source');
      expect(evidence.publisher).toBe('source.com');
      expect(evidence.published_at).toBe('2025-12-27');
      expect(evidence.snippet).toBe('Test snippet');
      expect(evidence.supports_claim).toBe(true);
      expect(evidence.confidence).toBe(0.85);
    });

    test('should support legacy fields', () => {
      const evidence: EvidenceItem = {
        url: 'https://source.com/page',
        title: 'Test Source',
        publisher: 'source.com',
        snippet: 'Test snippet',
        supports_claim: true,
        confidence: 0.85,
        domain: 'source.com',
        relevanceScore: 0.9,
        credibilityScore: 0.8,
        stanceTowardsClaim: 'supports',
      };

      expect(evidence.domain).toBe('source.com');
      expect(evidence.relevanceScore).toBe(0.9);
      expect(evidence.credibilityScore).toBe(0.8);
      expect(evidence.stanceTowardsClaim).toBe('supports');
    });
  });

  describe('Claim', () => {
    test('should support all ClaimType values', () => {
      const types: ClaimType[] = ['QUOTE', 'EVENT', 'SCHEDULE', 'POLICY', 'OTHER'];
      
      types.forEach(type => {
        const claim: Claim = {
          text: `Test claim of type ${type}`,
          type,
          importance: 0.8,
          checkability: 0.7,
          evidence: [],
          verdict: 'Supported',
          verdictConfidence: 0.9,
          reasoning: 'Test reasoning',
          evidenceSummary: {
            totalSources: 3,
            uniqueDomains: 2,
            supportingCount: 2,
            refutingCount: 0,
            averageCredibility: 0.8,
          },
          suggestedSearches: [],
        };

        expect(claim.type).toBe(type);
      });
    });
  });

  describe('AnalysisResult', () => {
    test('should have required new structure', () => {
      const result: AnalysisResult = {
        article_meta: {
          publisher: 'example.com',
          canonical_url: 'https://example.com/article',
        },
        claims: [],
        overall_score: {
          score: 75,
          confidence: 0.85,
          breakdown: {
            evidenceQuality: 80,
            sourceCredibility: 70,
            claimCheckability: 75,
          },
        },
        tactics: {
          score_0_to_100: 60,
          flags: ['emotional-language'],
          explanation: 'Test explanation',
        },
      };

      expect(result.article_meta).toBeDefined();
      expect(result.claims).toEqual([]);
      expect(result.overall_score.score).toBe(75);
      expect(result.overall_score.confidence).toBe(0.85);
      expect(result.overall_score.breakdown.evidenceQuality).toBe(80);
    });

    test('should support legacy overallVerifiability field', () => {
      const result: AnalysisResult = {
        article_meta: {},
        claims: [],
        overall_score: {
          score: 75,
          confidence: 0.85,
          breakdown: {
            evidenceQuality: 80,
            sourceCredibility: 70,
            claimCheckability: 75,
          },
        },
        overallVerifiability: {
          score: 75,
          confidence: 0.85,
          breakdown: {
            evidenceQuality: 80,
            sourceCredibility: 70,
            claimCheckability: 75,
          },
        },
        tactics: {
          score_0_to_100: 60,
          flags: [],
          explanation: '',
        },
      };

      expect(result.overallVerifiability).toBeDefined();
      expect(result.overallVerifiability?.score).toBe(75);
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize AnalysisResult correctly', () => {
      const result: AnalysisResult = {
        article_meta: {
          publisher: 'test.com',
          published_at: '2025-12-28',
          canonical_url: 'https://test.com/article',
        },
        claims: [
          {
            text: 'Test claim',
            type: 'EVENT',
            importance: 0.9,
            checkability: 0.8,
            evidence: [
              {
                url: 'https://source.com',
                title: 'Source',
                publisher: 'source.com',
                snippet: 'Test',
                supports_claim: true,
                confidence: 0.85,
              },
            ],
            verdict: 'Supported',
            verdictConfidence: 0.9,
            reasoning: 'Test reasoning',
            evidenceSummary: {
              totalSources: 1,
              uniqueDomains: 1,
              supportingCount: 1,
              refutingCount: 0,
              averageCredibility: 0.85,
            },
            suggestedSearches: ['test search'],
          },
        ],
        overall_score: {
          score: 85,
          confidence: 0.9,
          breakdown: {
            evidenceQuality: 90,
            sourceCredibility: 85,
            claimCheckability: 80,
          },
        },
        tactics: {
          score_0_to_100: 70,
          flags: ['test-flag'],
          explanation: 'Test',
        },
      };

      const serialized = JSON.stringify(result);
      const deserialized: AnalysisResult = JSON.parse(serialized);

      expect(deserialized.article_meta.publisher).toBe('test.com');
      expect(deserialized.claims).toHaveLength(1);
      expect(deserialized.claims[0].type).toBe('EVENT');
      expect(deserialized.claims[0].evidence[0].supports_claim).toBe(true);
      expect(deserialized.overall_score.score).toBe(85);
    });
  });
});
