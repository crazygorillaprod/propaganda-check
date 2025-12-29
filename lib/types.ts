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

/**
 * Narrative and propaganda analysis (Layer 2)
 * How people are being manipulated - tactics and effects
 */
export interface NarrativeAnalysis {
  dominant_frame: string;        // The primary framing used
  tactics_detected: string[];    // Propaganda tactics identified
  emotional_triggers: string[];  // Fear, anger, urgency, etc.
  repeated_phrases: string[];    // Key phrases repeated across content
  likely_effects: string[];      // What this framing encourages people to believe/do
}

/**
 * Evidence Gap analysis (Layer 3 - Synthesis)
 * What's missing, what would settle it
 */
export interface EvidenceGap {
  missing_evidence: string[];    // What evidence is not provided
  what_would_prove: string[];    // What evidence would prove the claim
  what_would_disprove: string[]; // What evidence would disprove the claim
}

export type TeachingTake = {
  // Public Mode structure (default)
  mode?: 'public' | 'professional';
  topline: string;                        // 1 sentence summary
  what_we_know: string[];                 // 2-4 bullets max (public), more in professional
  what_is_unclear: string[];              // 1-3 bullets
  what_to_say_back: string;               // Short comment-ready rebuttal (public mode)
  action_plan: {
    today: string[];                      // 2 bullets
    this_week: string[];                  // 2 bullets
    ongoing: string[];                    // 2 bullets
  };
  
  // Layer 2: Narrative analysis (all modes)
  narrative_analysis?: NarrativeAnalysis;
  evidence_gaps?: EvidenceGap;
  
  // Professional Mode sections (journalist-safe, neutral tone)
  how_this_gets_spun?: string[];          // framing tactics
  deeper_rebuttal?: string;               // longer analysis
  rebuttal_script?: {                     // legacy + extended versions
    short: string;                        // 15–25 sec
    medium: string;                       // 60 sec
    long: string;                         // 2–3 min
  };
  talk_tracks?: string[];                 // "If they say X, say Y"
  questions_to_ask?: string[];            // critical thinking prompts
  what_to_share_instead?: string[];       // safer alternatives
  
  // Legacy fields (kept for backward compatibility)
  executive_summary?: string;
  pro_democracy_take?: string;
  
  citations?: { claim_id: string; evidence_ids: string[] }[];
};

// Usage Metering Types
export type UsageTier = 'free' | 'pro' | 'creator' | 'organization';

export type UsagePeriod = {
  user_id: string;
  tier: UsageTier;
  period_start: Date;
  period_end: Date;
  
  // Fact checks (metered)
  fact_checks_used: number;
  fact_checks_limit: number;
  fact_checks_rollover: number;
  
  // Analysis runs (unmetered for paid tiers)
  analysis_runs_used: number;
  
  // Cost tracking
  estimated_cost: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
};

export type UsageEvent = {
  id: string;
  user_id: string;
  event_type: 'fact_check' | 'analysis_run';
  
  // What was analyzed
  input_type: 'url' | 'text' | 'claim' | 'video' | 'thread';
  input_hash: string;  // For cache detection
  
  // Cost attribution
  cost_estimate: number;
  apis_called: string[];  // ['brave-search', 'youtube', 'reddit']
  
  // Results
  claims_extracted: number;
  evidence_retrieved: number;
  used_cache: boolean;
  
  // Timestamps
  timestamp: Date;
  processing_time_ms: number;
};

export type CachedAnalysis = {
  input_hash: string;
  input_type: 'url' | 'text' | 'claim';
  input_content: string;
  
  // Cache metadata
  created_at: Date;
  expires_at: Date;
  access_count: number;
  last_accessed: Date;
  
  // Cached results
  analysis_result: AnalysisResult;
  
  // Cost savings
  original_cost: number;
};

export type QuotaCheckResult = {
  allowed: boolean;
  remaining: number;
  total_available: number;
  reason?: string;
};
