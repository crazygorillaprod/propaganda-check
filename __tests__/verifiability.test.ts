import { calculateClaimVerifiability, calculateOverallVerifiability } from '../lib/verifiability';
import { Claim } from '../lib/types';

describe('Verifiability Scoring', () => {
  describe('calculateClaimVerifiability', () => {
    test('should score QUOTE with direct attribution highest', () => {
      const claim: Claim = {
        text: 'The president said "we will reduce taxes"',
        type: 'QUOTE',
        importance: 0.9,
        checkability: 0.8,
        attribution_type: 'DIRECT_QUOTE',
        evidence: [
          {
            url: 'https://reuters.com/article',
            title: 'President announces tax plan',
            publisher: 'reuters.com',
            snippet: 'The president announced plans to reduce taxes',
            supports_claim: true,
            confidence: 0.9,
          },
          {
            url: 'https://apnews.com/article',
            title: 'Tax reduction plan',
            publisher: 'apnews.com',
            snippet: 'New tax plan details',
            supports_claim: true,
            confidence: 0.85,
          },
        ],
        verdict: 'Supported',
        verdictConfidence: 0.9,
        reasoning: 'Multiple sources confirm',
        evidenceSummary: {
          totalSources: 2,
          uniqueDomains: 2,
          supportingCount: 2,
          refutingCount: 0,
          averageCredibility: 0.9,
        },
        suggestedSearches: [],
      };

      const result = calculateClaimVerifiability(claim);
      
      // QUOTE with DIRECT_QUOTE should get full attribution (30)
      expect(result.breakdown.attribution).toBe(30);
      // First corroboration with high credibility (0.9 * 30 = 27)
      expect(result.breakdown.corroboration_1).toBe(27);
      // Second source (2 domains = 1 additional, 1/3 * 20 = 7)
      expect(result.breakdown.corroboration_2plus).toBe(7);
      // Specificity from checkability (0.8 * 20 = 16)
      expect(result.breakdown.specificity).toBe(16);
      // Total should be high
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    test('should weight EVENT for corroboration over attribution', () => {
      const claim: Claim = {
        text: 'A fire occurred at the building',
        type: 'EVENT',
        importance: 0.8,
        checkability: 0.7,
        attribution_type: 'UNATTRIBUTED',
        evidence: [
          {
            url: 'https://reuters.com/fire',
            title: 'Building fire reported',
            publisher: 'reuters.com',
            snippet: 'Fire crews responded to building fire',
            supports_claim: true,
            confidence: 0.9,
          },
          {
            url: 'https://bbc.com/fire',
            title: 'Fire damages building',
            publisher: 'bbc.com',
            snippet: 'Local fire at commercial building',
            supports_claim: true,
            confidence: 0.85,
          },
        ],
        verdict: 'Supported',
        verdictConfidence: 0.85,
        reasoning: 'Multiple news sources confirm',
        evidenceSummary: {
          totalSources: 2,
          uniqueDomains: 2,
          supportingCount: 2,
          refutingCount: 0,
          averageCredibility: 0.9,
        },
        suggestedSearches: [],
      };

      const result = calculateClaimVerifiability(claim);
      
      // EVENT with UNATTRIBUTED: attribution reduced to 10 * 0.7 = 7
      expect(result.breakdown.attribution).toBe(7);
      // Corroboration boosted by 15%: round(27 * 1.15) = 31, capped at 30
      expect(result.breakdown.corroboration_1).toBe(30);
      // Second source (2 domains = 1 additional, 1/3 * 20 = 7)
      expect(result.breakdown.corroboration_2plus).toBe(7);
    });

    test('should penalize vague SCHEDULE claims', () => {
      const claim: Claim = {
        text: 'Meeting will happen soon',
        type: 'SCHEDULE',
        importance: 0.6,
        checkability: 0.4, // Vague, low checkability
        attribution_type: 'REPORTED_SPEECH',
        evidence: [
          {
            url: 'https://example.com/schedule',
            title: 'Upcoming meeting',
            publisher: 'example.com',
            snippet: 'Meeting scheduled',
            supports_claim: true,
            confidence: 0.6,
          },
        ],
        verdict: 'Mixed',
        verdictConfidence: 0.6,
        reasoning: 'Vague timing',
        evidenceSummary: {
          totalSources: 1,
          uniqueDomains: 1,
          supportingCount: 1,
          refutingCount: 0,
          averageCredibility: 0.5,
        },
        suggestedSearches: [],
      };

      const result = calculateClaimVerifiability(claim);
      
      // SCHEDULE with low checkability: specificity penalized (0.4 * 20 * 0.5 = 4)
      expect(result.breakdown.specificity).toBe(4);
      // Overall score should be low
      expect(result.score).toBeLessThan(40);
    });

    test('should handle no evidence gracefully', () => {
      const claim: Claim = {
        text: 'Unverifiable claim',
        type: 'OTHER',
        importance: 0.5,
        checkability: 0.6,
        evidence: [],
        verdict: 'Insufficient evidence',
        verdictConfidence: 0.2,
        reasoning: 'No sources found',
        evidenceSummary: {
          totalSources: 0,
          uniqueDomains: 0,
          supportingCount: 0,
          refutingCount: 0,
          averageCredibility: 0,
        },
        suggestedSearches: [],
      };

      const result = calculateClaimVerifiability(claim);
      
      // Should return minimal scores
      expect(result.breakdown.corroboration_1).toBe(0);
      expect(result.breakdown.corroboration_2plus).toBe(0);
      expect(result.score).toBeLessThan(30);
    });
  });

  describe('calculateOverallVerifiability', () => {
    test('snapshot: EVIDENCE_FOUND status with evidence', () => {
      const claims: Claim[] = [
        {
          text: 'Test claim',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.7,
          attribution_type: 'OFFICIAL_STATEMENT',
          evidence: [
            {
              url: 'https://reuters.com/test',
              title: 'Test article',
              publisher: 'reuters.com',
              snippet: 'Test content',
              supports_claim: true,
              confidence: 0.9,
            },
          ],
          verdict: 'Supported',
          verdictConfidence: 0.8,
          reasoning: 'Evidence found',
          evidenceSummary: {
            totalSources: 1,
            uniqueDomains: 1,
            supportingCount: 1,
            refutingCount: 0,
            averageCredibility: 0.9,
          },
          suggestedSearches: [],
        },
      ];

      const result = calculateOverallVerifiability(claims, true);
      
      expect(result).toMatchSnapshot({
        score: expect.any(Number),
        confidence: expect.any(Number),
        breakdown: {
          attribution: expect.any(Number),
          corroboration_1: expect.any(Number),
          corroboration_2plus: expect.any(Number),
          specificity: expect.any(Number),
          evidenceQuality: expect.any(Number),
          sourceCredibility: expect.any(Number),
          claimCheckability: expect.any(Number),
        },
        status: 'EVIDENCE_FOUND',
      });
      
      expect(result.status).toBe('EVIDENCE_FOUND');
      expect(result.score).not.toBeNull();
      expect(result.message).toBeUndefined();
    });

    test('snapshot: NOT_RUN status when search disabled', () => {
      const claims: Claim[] = [
        {
          text: 'Test claim',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.7,
          evidence: [],
          verdict: 'Insufficient evidence',
          verdictConfidence: 0,
          reasoning: 'Search disabled',
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

      const result = calculateOverallVerifiability(claims, false);
      
      expect(result).toMatchSnapshot();
      
      expect(result.status).toBe('NOT_RUN');
      expect(result.score).toBeNull();
      expect(result.message).toBe('Evidence retrieval not run');
      expect(result.retrieval_state).toBe('NOT_RUN');
      expect(result.retrieval_reason).toContain('missing API key');
      expect(result.breakdown.attribution).toBe(0);
      expect(result.breakdown.corroboration_1).toBe(0);
    });

    test('snapshot: NO_EVIDENCE_FOUND status', () => {
      const claims: Claim[] = [
        {
          text: 'Obscure claim',
          type: 'OTHER',
          importance: 0.6,
          checkability: 0.5,
          evidence: [],
          verdict: 'Insufficient evidence',
          verdictConfidence: 0.1,
          reasoning: 'No evidence found',
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
      
      expect(result).toMatchSnapshot();
      
      expect(result.status).toBe('NO_EVIDENCE_FOUND');
      expect(result.score).toBeNull();
      expect(result.confidence).toBeNull();
      expect(result.message).toBe('No corroboration found.');
      expect(result.retrieval_state).toBe('RAN_NO_RESULTS');
    });

    test('snapshot: complex multi-claim scenario', () => {
      const claims: Claim[] = [
        {
          text: '"We will increase funding" - official statement',
          type: 'QUOTE',
          importance: 0.9,
          checkability: 0.85,
          attribution_type: 'DIRECT_QUOTE',
          evidence: [
            {
              url: 'https://reuters.com/funding',
              title: 'Funding announcement',
              publisher: 'reuters.com',
              snippet: 'Official funding increase announced',
              supports_claim: true,
              confidence: 0.9,
            },
            {
              url: 'https://apnews.com/funding',
              title: 'Budget increase',
              publisher: 'apnews.com',
              snippet: 'New budget allocation',
              supports_claim: true,
              confidence: 0.85,
            },
            {
              url: 'https://bbc.com/funding',
              title: 'Funding news',
              publisher: 'bbc.com',
              snippet: 'Additional funding approved',
              supports_claim: true,
              confidence: 0.8,
            },
          ],
          verdict: 'Supported',
          verdictConfidence: 0.95,
          reasoning: 'Multiple credible sources',
          evidenceSummary: {
            totalSources: 3,
            uniqueDomains: 3,
            supportingCount: 3,
            refutingCount: 0,
            averageCredibility: 0.9,
          },
          suggestedSearches: [],
        },
        {
          text: 'New program starts January 15th',
          type: 'SCHEDULE',
          importance: 0.7,
          checkability: 0.9, // Specific date
          attribution_type: 'OFFICIAL_STATEMENT',
          evidence: [
            {
              url: 'https://gov.example/schedule',
              title: 'Program start date',
              publisher: 'gov.example',
              snippet: 'January 15th launch confirmed',
              supports_claim: true,
              confidence: 0.95,
            },
          ],
          verdict: 'Supported',
          verdictConfidence: 0.9,
          reasoning: 'Official source with specific date',
          evidenceSummary: {
            totalSources: 1,
            uniqueDomains: 1,
            supportingCount: 1,
            refutingCount: 0,
            averageCredibility: 0.9,
          },
          suggestedSearches: [],
        },
        {
          text: 'Incident occurred at the location',
          type: 'EVENT',
          importance: 0.8,
          checkability: 0.6,
          evidence: [
            {
              url: 'https://localnews.com/incident',
              title: 'Local incident',
              publisher: 'localnews.com',
              snippet: 'Incident reported',
              supports_claim: true,
              confidence: 0.6,
            },
          ],
          verdict: 'Mixed',
          verdictConfidence: 0.6,
          reasoning: 'Limited sources',
          evidenceSummary: {
            totalSources: 1,
            uniqueDomains: 1,
            supportingCount: 1,
            refutingCount: 0,
            averageCredibility: 0.5,
          },
          suggestedSearches: [],
        },
      ];

      const result = calculateOverallVerifiability(claims, true);
      
      expect(result).toMatchSnapshot({
        score: expect.any(Number),
        confidence: expect.any(Number),
        breakdown: {
          attribution: expect.any(Number),
          corroboration_1: expect.any(Number),
          corroboration_2plus: expect.any(Number),
          specificity: expect.any(Number),
          evidenceQuality: expect.any(Number),
          sourceCredibility: expect.any(Number),
          claimCheckability: expect.any(Number),
        },
        status: 'EVIDENCE_FOUND',
      });
      
      expect(result.status).toBe('EVIDENCE_FOUND');
      expect(result.score).toBeGreaterThan(60); // Should be reasonably high
    });
  });
});
