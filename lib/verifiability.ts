import { Claim, ScoreBreakdown } from './types';

export function calculateClaimVerifiability(claim: Claim): number {
  const { evidence, checkability, evidenceSummary } = claim;
  
  if (evidence.length === 0) return 0;
  
  // Factors:
  // 1. Number of unique sources (more is better)
  const sourceScore = Math.min(evidenceSummary.uniqueDomains / 4, 1) * 30;
  
  // 2. Average credibility of sources
  const credibilityScore = evidenceSummary.averageCredibility * 30;
  
  // 3. Claim checkability (factual claims score higher)
  const checkabilityScore = checkability * 20;
  
  // 4. Evidence clarity (supporting vs refuting)
  const clarityRatio = evidenceSummary.totalSources > 0
    ? (evidenceSummary.supportingCount + evidenceSummary.refutingCount) / evidenceSummary.totalSources
    : 0;
  const clarityScore = clarityRatio * 20;
  
  return Math.round(sourceScore + credibilityScore + checkabilityScore + clarityScore);
}

export function calculateOverallVerifiability(
  claims: Claim[]
): { score: number; confidence: number; breakdown: ScoreBreakdown } {
  if (claims.length === 0) {
    return {
      score: 0,
      confidence: 0,
      breakdown: {
        evidenceQuality: 0,
        sourceCredibility: 0,
        claimCheckability: 0,
      },
    };
  }
  
  // Calculate per-claim verifiability and weight by importance
  const weightedScores = claims.map(claim => ({
    verifiability: calculateClaimVerifiability(claim),
    importance: claim.importance,
  }));
  
  const totalWeight = weightedScores.reduce((sum, s) => sum + s.importance, 0);
  const overallScore = weightedScores.reduce(
    (sum, s) => sum + (s.verifiability * s.importance),
    0
  ) / (totalWeight || 1);
  
  // Calculate breakdown
  const avgEvidenceQuality = claims.reduce((sum, c) => 
    sum + (c.evidenceSummary.totalSources > 0 ? c.evidenceSummary.uniqueDomains / 4 : 0), 0
  ) / claims.length;
  
  const avgSourceCredibility = claims.reduce((sum, c) => 
    sum + c.evidenceSummary.averageCredibility, 0
  ) / claims.length;
  
  const avgCheckability = claims.reduce((sum, c) => 
    sum + c.checkability, 0
  ) / claims.length;
  
  // Confidence based on evidence completeness
  const claimsWithEvidence = claims.filter(c => c.evidence.length >= 2).length;
  const confidence = claimsWithEvidence / claims.length;
  
  return {
    score: Math.round(overallScore),
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      evidenceQuality: Math.round(avgEvidenceQuality * 100),
      sourceCredibility: Math.round(avgSourceCredibility * 100),
      claimCheckability: Math.round(avgCheckability * 100),
    },
  };
}

export function identifyEvidenceGaps(claim: Claim): string[] {
  const gaps: string[] = [];
  
  if (claim.evidenceSummary.uniqueDomains < 2) {
    gaps.push('insufficient-sources');
  }
  
  if (claim.evidenceSummary.averageCredibility < 0.5) {
    gaps.push('low-credibility');
  }
  
  if (claim.evidenceSummary.supportingCount === 0 && claim.evidenceSummary.refutingCount === 0) {
    gaps.push('unclear-stance');
  }
  
  if (claim.evidence.some(e => e.relevanceScore !== undefined && e.relevanceScore < 0.5)) {
    gaps.push('low-relevance');
  }
  
  return gaps;
}

export function generateSmartSearches(
  claim: Claim,
  evidenceGaps: string[],
  inputDomain?: string
): string[] {
  const searches: string[] = [];
  const claimText = claim.text;
  
  // Always include fact-check search
  searches.push(`${claimText} fact check`);
  
  // If we need more sources or credibility
  if (evidenceGaps.includes('insufficient-sources') || evidenceGaps.includes('low-credibility')) {
    searches.push(`site:.gov ${claimText}`);
    searches.push(`site:.edu ${claimText}`);
    searches.push(`${claimText} study research`);
  }
  
  // If stance is unclear, search for verification
  if (evidenceGaps.includes('unclear-stance')) {
    searches.push(`${claimText} verify evidence`);
    searches.push(`${claimText} true or false`);
  }
  
  // Exclude original domain if provided
  if (inputDomain) {
    searches.push(`${claimText} -site:${inputDomain}`);
  }
  
  // Add specific search for claim type
  switch (claim.type) {
    case 'QUOTE':
      searches.push(`"${claimText}" verification`);
      searches.push(`${claimText} transcript`);
      break;
    case 'EVENT':
      searches.push(`${claimText} news reports`);
      searches.push(`${claimText} eyewitness`);
      break;
    case 'SCHEDULE':
      searches.push(`${claimText} official announcement`);
      searches.push(`${claimText} calendar`);
      break;
    case 'POLICY':
      searches.push(`${claimText} official policy`);
      searches.push(`${claimText} legislation`);
      break;
    case 'OTHER':
      searches.push(`${claimText} statistics data`);
      break;
  }
  
  return searches.slice(0, 5); // Limit to 5 searches per claim
}
