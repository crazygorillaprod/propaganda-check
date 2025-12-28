import { Claim, EvidenceItem, ScoreBreakdown, VerifiabilityStatus, RetrievalState } from './types';

function isInputEvidence(e: EvidenceItem): boolean {
  return e.role === 'INPUT';
}

function isCorroborationEvidence(e: EvidenceItem): boolean {
  return !isInputEvidence(e);
}

/**
 * Calculate verifiability for a single claim with new scoring breakdown.
 * Scores: attribution (0-30), corroboration_1 (0-30), corroboration_2plus (0-20), specificity (0-20)
 */
export function calculateClaimVerifiability(claim: Claim): { score: number; breakdown: ScoreBreakdown } {
  const { evidence, checkability, evidenceSummary, attribution_type, type: claimType } = claim;

  const allEvidence = evidence || [];
  const corroborationEvidence = allEvidence.filter(isCorroborationEvidence);
  const hasInputEvidence = allEvidence.some(isInputEvidence);
  
  // 1. Attribution score (0-30)
  let attributionScore = 0;
  if (attribution_type === 'DIRECT_QUOTE') {
    attributionScore = 30;
  } else if (attribution_type === 'OFFICIAL_STATEMENT') {
    attributionScore = 25;
  } else if (attribution_type === 'REPORTED_SPEECH') {
    attributionScore = 20;
  } else {
    // UNATTRIBUTED or no attribution
    attributionScore = 10;
  }
  
  // Apply claim-type weighting for attribution
  if (claimType === 'QUOTE') {
    // Quotes: attribution is critical (keep full weight)
    attributionScore = attributionScore;
  } else if (claimType === 'EVENT' || claimType === 'SCHEDULE') {
    // Events/Schedule: attribution less critical (reduce by 30%)
    attributionScore = Math.round(attributionScore * 0.7);
  }
  
  // 2. First corroboration score (0-30)
  let corroboration1Score = 0;
  if (corroborationEvidence.length > 0 && evidenceSummary.uniqueDomains >= 1) {
    // First reputable source found
    const firstSourceCredibility = evidenceSummary.averageCredibility;
    corroboration1Score = Math.round(firstSourceCredibility * 30);
  }
  
  // Apply claim-type weighting for corroboration
  if (claimType === 'EVENT' || claimType === 'SCHEDULE') {
    // Events/Schedule: corroboration is critical (boost by 15%)
    corroboration1Score = Math.min(Math.round(corroboration1Score * 1.15), 30);
  }
  
  // 3. Additional corroboration score (0-20)
  let corroboration2PlusScore = 0;
  if (evidenceSummary.uniqueDomains >= 2) {
    // Diminishing returns: 2 sources = 15, 3 sources = 18, 4+ sources = 20
    const additionalSources = Math.min(evidenceSummary.uniqueDomains - 1, 3);
    corroboration2PlusScore = Math.round((additionalSources / 3) * 20);
  }
  
  // 4. Specificity score (0-20)
  let specificityScore = Math.round(checkability * 20);
  
  // SCHEDULE claims: penalize vague claims (require high checkability)
  if (claimType === 'SCHEDULE' && checkability < 0.7) {
    specificityScore = Math.round(specificityScore * 0.5);
  }
  
  let totalScore = attributionScore + corroboration1Score + corroboration2PlusScore + specificityScore;

  // If we only have INPUT evidence (no external corroboration), cap the contribution.
  // This reflects that "appears in provided source" is not the same as verification.
  if (hasInputEvidence && corroborationEvidence.length === 0) {
    totalScore = Math.min(attributionScore + specificityScore, 40);
  }
  
  return {
    score: Math.min(totalScore, 100),
    breakdown: {
      attribution: attributionScore,
      corroboration_1: corroboration1Score,
      corroboration_2plus: corroboration2PlusScore,
      specificity: specificityScore,
      // Legacy fields for backward compatibility
      evidenceQuality: Math.round((corroboration1Score + corroboration2PlusScore) / 50 * 100),
      sourceCredibility: Math.round(evidenceSummary.averageCredibility * 100),
      claimCheckability: Math.round(checkability * 100),
    },
  };
}

export function calculateOverallVerifiability(
  claims: Claim[],
  searchEnabled: boolean = true
): { 
  score: number | null; 
  confidence: number | null; 
  breakdown: ScoreBreakdown; 
  status: VerifiabilityStatus;
  message?: string;
  retrieval_state: RetrievalState;
  retrieval_reason: string;
} {
  // If search is disabled, return NOT_RUN status with null score
  if (!searchEnabled) {
    return {
      score: null,
      confidence: null,
      breakdown: {
        attribution: 0,
        corroboration_1: 0,
        corroboration_2plus: 0,
        specificity: 0,
        evidenceQuality: null,
        sourceCredibility: null,
        claimCheckability: null,
      },
      status: 'NOT_RUN',
      message: 'Evidence retrieval not run',
      retrieval_state: 'NOT_RUN',
      retrieval_reason: 'missing API key',
    };
  }
  
  if (claims.length === 0) {
    return {
      score: null,
      confidence: null,
      breakdown: {
        attribution: 0,
        corroboration_1: 0,
        corroboration_2plus: 0,
        specificity: 0,
        evidenceQuality: null,
        sourceCredibility: null,
        claimCheckability: null,
      },
      status: 'NO_EVIDENCE_FOUND',
      message: 'No claims identified for verification.',
      retrieval_state: 'NOT_RUN',
      retrieval_reason: 'No claims identified for verification.',
    };
  }
  
  // Check if we retrieved any CORROBORATION evidence at all
  const totalCorroborationEvidence = claims.reduce(
    (sum, c) => sum + (c.evidence || []).filter(isCorroborationEvidence).length,
    0
  );
  if (totalCorroborationEvidence === 0) {
    return {
      score: null,
      confidence: null,
      breakdown: {
        attribution: 0,
        corroboration_1: 0,
        corroboration_2plus: 0,
        specificity: 0,
        evidenceQuality: null,
        sourceCredibility: null,
        claimCheckability: null,
      },
      status: 'NO_EVIDENCE_FOUND',
      message: 'No corroboration found.',
      retrieval_state: 'RAN_NO_RESULTS',
      retrieval_reason: 'Search was attempted but returned 0 evidence results.',
    };
  }
  
  // Calculate per-claim verifiability and weight by importance
  const claimResults = claims.map(claim => {
    const result = calculateClaimVerifiability(claim);
    return {
      score: result.score,
      breakdown: result.breakdown,
      importance: claim.importance,
    };
  });
  
  const totalWeight = claimResults.reduce((sum, r) => sum + r.importance, 0);
  const overallScore = claimResults.reduce(
    (sum, r) => sum + (r.score * r.importance),
    0
  ) / (totalWeight || 1);
  
  // Calculate weighted average breakdown
  const avgAttribution = claimResults.reduce(
    (sum, r) => sum + (r.breakdown.attribution * r.importance), 0
  ) / (totalWeight || 1);
  
  const avgCorroboration1 = claimResults.reduce(
    (sum, r) => sum + (r.breakdown.corroboration_1 * r.importance), 0
  ) / (totalWeight || 1);
  
  const avgCorroboration2Plus = claimResults.reduce(
    (sum, r) => sum + (r.breakdown.corroboration_2plus * r.importance), 0
  ) / (totalWeight || 1);
  
  const avgSpecificity = claimResults.reduce(
    (sum, r) => sum + (r.breakdown.specificity * r.importance), 0
  ) / (totalWeight || 1);
  
  // Legacy breakdown fields
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
  const claimsWithEvidence = claims.filter(c => (c.evidence || []).filter(isCorroborationEvidence).length >= 2).length;
  const confidence = claimsWithEvidence / claims.length;
  
  return {
    score: Math.round(overallScore),
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      attribution: Math.round(avgAttribution),
      corroboration_1: Math.round(avgCorroboration1),
      corroboration_2plus: Math.round(avgCorroboration2Plus),
      specificity: Math.round(avgSpecificity),
      // Legacy fields
      evidenceQuality: Math.round(avgEvidenceQuality * 100),
      sourceCredibility: Math.round(avgSourceCredibility * 100),
      claimCheckability: Math.round(avgCheckability * 100),
    },
    status: 'EVIDENCE_FOUND',
    retrieval_state: 'RAN_WITH_RESULTS',
    retrieval_reason: 'Search returned evidence results.',
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
