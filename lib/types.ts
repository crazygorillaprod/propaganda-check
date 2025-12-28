export type ArticleMeta = {
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
  publishDate?: string;
  author?: string;
  sourceType?: 'news' | 'blog' | 'gov' | 'academic' | 'social' | 'unknown';
};

export type EvidenceItem = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  age?: string;
  relevanceScore: number;      // 0-1: how well it addresses the claim
  credibilityScore: number;    // 0-1: source reputation
  stanceTowardsClaim: 'supports' | 'refutes' | 'neutral' | 'unclear';
  keyQuote?: string;           // extracted relevant excerpt
};

export type Claim = {
  text: string;
  type: 'factual' | 'opinion' | 'prediction' | 'mixed';
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

export type AnalysisResult = {
  articleMeta: ArticleMeta;
  claims: Claim[];
  overallVerifiability: {
    score: number;             // 0-100
    confidence: number;        // 0-1
    breakdown: {
      evidenceQuality: number;
      sourceCredibility: number;
      claimCheckability: number;
    };
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
