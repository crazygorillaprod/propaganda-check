export type ClaimType = 'QUOTE' | 'EVENT' | 'SCHEDULE' | 'POLICY' | 'OTHER';

export type ArticleMeta = {
  publisher?: string;
  author?: string;
  published_at?: string;
  canonical_url?: string;
  // Keep legacy fields for backward compatibility
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
  publishDate?: string;
  sourceType?: 'news' | 'blog' | 'gov' | 'academic' | 'social' | 'unknown';
};

export type EvidenceItem = {
  url: string;
  title: string;
  publisher: string;
  published_at?: string;
  snippet: string;
  supports_claim: boolean;
  confidence: number;       // 0-1
  // Keep legacy fields for backward compatibility
  domain?: string;
  age?: string;
  relevanceScore?: number;
  credibilityScore?: number;
  stanceTowardsClaim?: 'supports' | 'refutes' | 'neutral' | 'unclear';
  keyQuote?: string;
};

export type Claim = {
  text: string;
  type: ClaimType;
  importance: number;          // 0-1: how central to the input
  checkability: number;        // 0-1: how verifiable
  evidence: EvidenceItem[];
  verdict: 'Supported' | 'Mixed' | 'Not supported' | 'Insufficient evidence';
  verdictConfidence: number;   // 0-1
  reasoning: string;
  evidenceSummary: {
    totalSources: number;
    uniqueDomains: number;
    supportingCount: number;
    refutingCount: number;
    averageCredibility: number;
  };
  suggestedSearches: string[]; // claim-specific searches to fill gaps
};

export type ScoreBreakdown = {
  evidenceQuality: number;
  sourceCredibility: number;
  claimCheckability: number;
};

export type AnalysisResult = {
  article_meta: ArticleMeta;
  claims: Claim[];
  overall_score: {
    score: number;             // 0-100
    confidence: number;        // 0-1
    breakdown: ScoreBreakdown;
  };
  // Keep legacy fields for backward compatibility
  overallVerifiability?: {
    score: number;
    confidence: number;
    breakdown: ScoreBreakdown;
  };
  tactics: {
    score_0_to_100: number;
    flags: string[];
    explanation: string;
  };
  rebuttal?: {
    short: string;
    medium?: string;
  };
  debug?: any;
};
