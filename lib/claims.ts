import OpenAI from 'openai';
import { Claim, ClaimType } from './types';

type RawClaimExtraction = {
  text: string;
  type: ClaimType;
  importance: number;
};

export function assessCheckability(claimText: string): number {
  const text = claimText.toLowerCase();
  
  // High checkability indicators
  const factualIndicators = [
    /\d+/,  // contains numbers
    /percent|%/,
    /said|announced|reported|stated/,
    /according to/,
    /study|research|data|statistics/,
    /year|date|month|day/,
  ];
  
  // Low checkability indicators
  const opinionIndicators = [
    /believe|think|feel|seem|appear/,
    /should|could|might|may/,
    /probably|possibly|likely/,
    /good|bad|better|worse/,
    /beautiful|ugly|great|terrible/,
  ];
  
  let score = 0.5; // baseline
  
  // Increase for factual indicators
  for (const pattern of factualIndicators) {
    if (pattern.test(text)) score += 0.1;
  }
  
  // Decrease for opinion indicators
  for (const pattern of opinionIndicators) {
    if (pattern.test(text)) score -= 0.1;
  }
  
  return Math.max(0.1, Math.min(1.0, score));
}

export function rankClaimImportance(claims: Claim[], textLength: number): Claim[] {
  // Claims mentioned earlier in text are often more important
  // This is already captured in importance from extraction, so just return
  return claims.sort((a, b) => b.importance - a.importance);
}

export async function extractStructuredClaims(
  text: string,
  openai: OpenAI
): Promise<Claim[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: [
            'Extract 3-6 checkable claims from the text.',
            'For each claim, provide:',
            '- text: the claim statement',
            '- type: "QUOTE" (someone said X), "EVENT" (X happened), "SCHEDULE" (X will happen), "POLICY" (rule/law/decision), or "OTHER"',
            '- importance: 0-1 (how central to the main argument)',
            '',
            'Return JSON: { claims: Array<{ text: string, type: string, importance: number }> }',
          ].join('\n'),
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const rawClaims: RawClaimExtraction[] = Array.isArray(result.claims)
      ? result.claims.slice(0, 6)
      : [];
    
    return rawClaims.map(raw => ({
      text: raw.text || '',
      type: ['QUOTE', 'EVENT', 'SCHEDULE', 'POLICY', 'OTHER'].includes(raw.type)
        ? (raw.type as ClaimType)
        : 'OTHER',
      importance: typeof raw.importance === 'number' ? raw.importance : 0.5,
      checkability: assessCheckability(raw.text || ''),
      evidence: [],
      verdict: 'Insufficient evidence' as const,
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
    }));
  } catch (error) {
    console.error('Error extracting structured claims:', error);
    return [];
  }
}
