export type ClaimType = 'QUOTE' | 'EVENT' | 'SCHEDULE' | 'POLICY' | 'OTHER';

export type AttributionType = 'DIRECT_QUOTE' | 'REPORTED_SPEECH' | 'OFFICIAL_STATEMENT' | 'UNATTRIBUTED';

export type ArticleMeta = {
  publisher?: string;
  publisher_wrapper?: string;
  publisher_original?: string;
  publisher_original_url?: string;
  publisher_original_detected_via?: string;
  author?: string;
  published_at?: string;
  canonical_url?: string;
  detected_via?: 'json-ld' | 'meta-tags' | 'attribution-regex' | 'canonical-link' | 'domain-fallback';
  // Keep legacy fields for backward compatibility
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
  publishDate?: string;
  sourceType?: 'news' | 'blog' | 'gov' | 'academic' | 'social' | 'unknown';
};

export type EvidenceItem = {
  role?: 'INPUT' | 'CORROBORATION';
  url: string;
  title: string;
  domain: string;
  publisher: string;
  published_at?: string;
  snippet: string;
  stance: 'support' | 'refute' | 'context' | 'unclear';
  credibility: number;
  // Keep legacy fields for backward compatibility
  supports_claim?: boolean;
  confidence?: number;       // 0-1
  age?: string;
  relevanceScore?: number;
  credibilityScore?: number;
  stanceTowardsClaim?: 'supports' | 'refutes' | 'neutral' | 'context' | 'unclear';
  keyQuote?: string;
};

export type Claim = {
  text: string;
  type: ClaimType;
  importance: number;          // 0-1: how central to the input
  checkability: number;        // 0-1: how verifiable
  attribution_type?: AttributionType;
  attribution_snippet?: string;
  evidence: EvidenceItem[];
  verdict: 'Supported' | 'Likely supported' | 'Mixed/unclear' | 'Not supported' | 'No corroboration found' | 'Not verified yet' | 'Insufficient evidence' | 'Appears in provided source (not yet corroborated)';
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
  attribution: number;           // 0-30: quality and type of attribution
  corroboration_1: number;        // 0-30: first reputable source found
  corroboration_2plus: number;    // 0-20: additional sources (diminishing returns)
  specificity: number;            // 0-20: claim specificity and checkability
  // Legacy fields for backward compatibility
  evidenceQuality?: number | null;
  sourceCredibility?: number | null;
  claimCheckability?: number | null;
};

export type VerifiabilityStatus = 'NOT_RUN' | 'NO_EVIDENCE_FOUND' | 'EVIDENCE_FOUND';

export type RetrievalState = 'NOT_RUN' | 'RAN_NO_RESULTS' | 'RAN_WITH_RESULTS';

export type AnalysisResult = {
  article_meta: ArticleMeta;
  claims: Claim[];
  overall_score: {
    score: number | null;      // 0-100 or null when NOT_RUN
    confidence: number | null; // 0-1 or null when NOT_RUN
    breakdown: ScoreBreakdown;
    status?: VerifiabilityStatus;  // indicates if search ran successfully
    message?: string;          // human-readable message for non-VERIFIED states
    retrieval_state?: RetrievalState;
    retrieval_reason?: string;
  };
  // Keep legacy fields for backward compatibility
  overallVerifiability?: {
    score: number | null;
    confidence: number | null;
    breakdown: ScoreBreakdown;
    status?: VerifiabilityStatus;
    message?: string;
    retrieval_state?: RetrievalState;
    retrieval_reason?: string;
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
  debug?: unknown;
};
