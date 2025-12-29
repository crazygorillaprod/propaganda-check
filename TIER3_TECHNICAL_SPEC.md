# Tier 3: Full Spectrum Analysis — Technical Specification

This document outlines the technical implementation plan for **Tier 3 (Creator/Commentary)** capabilities.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      INPUT LAYER                            │
│  Single comment | Thread | Article | Video | Script draft   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   INGESTION LAYER                           │
│  • HTML Parser (existing)                                   │
│  • YouTube Transcript Fetcher (new)                         │
│  • Reddit Scraper (new)                                     │
│  • Social Thread Parser (new)                               │
│  • Official Source Fetcher (new)                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXTRACTION LAYER                           │
│  • Claims extraction (existing)                             │
│  • Narrative identification (new)                           │
│  • Framing analysis (enhanced)                              │
│  • Attribution tracking (existing)                          │
│  • Timeline extraction (new)                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               MULTI-PLATFORM AGGREGATION                    │
│  • Cross-platform deduplication                             │
│  • Origin tracking                                          │
│  • Narrative clustering                                     │
│  • Source reputation weighting                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  ANALYSIS LAYER                             │
│  • Verifiability scoring (existing)                         │
│  • Narrative-level impact assessment (new)                  │
│  • Propaganda pattern matching (new)                        │
│  • Risk scoring (enhanced)                                  │
│  • Action framing (new)                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT LAYER                              │
│  • Receipt Pack                                             │
│  • Talking Points (30s/60s/long)                            │
│  • Propaganda Pattern Map                                   │
│  • Action Framing                                           │
│  • Citation Builder                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## New Data Types

### 1. Multi-Platform Evidence

```typescript
export type PlatformSource = 'news' | 'youtube' | 'reddit' | 'twitter' | 'official';

export type MultiPlatformEvidence = {
  id: string;
  platform: PlatformSource;
  url: string;
  title: string;
  author?: string;
  published_at?: string;
  content: string;
  transcript?: string;  // for YouTube
  engagement?: {
    views?: number;
    upvotes?: number;
    comments?: number;
  };
  credibility: number;
  stance: 'support' | 'refute' | 'context' | 'unclear';
  extracted_claims: string[];
  metadata: Record<string, unknown>;
};
```

### 2. Narrative Structure

```typescript
export type NarrativeFrame = {
  id: string;
  core_narrative: string;          // e.g., "Peace talks imminent"
  framing_technique: string[];     // e.g., ["false-certainty", "selective-emphasis"]
  claims_supporting: string[];     // claim IDs
  evidence_clusters: string[];     // evidence IDs
  counter_narrative?: string;      // alternative framing
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  psychological_hooks: string[];   // e.g., ["fear", "us-vs-them", "authority"]
  historical_precedent?: string[]; // similar narratives in the past
};
```

### 3. Receipt Pack

```typescript
export type ReceiptPack = {
  top_10_facts: {
    fact: string;
    sources: string[];              // outlet names
    evidence_ids: string[];
    confidence: number;
  }[];
  top_5_misrepresentations: {
    claim: string;
    misrepresentation_type: string; // "exaggeration", "omission", "distortion"
    evidence: string[];
    correction: string;
  }[];
  attribution_timeline: {
    timestamp: string;
    who: string;
    said: string;
    source_url: string;
    context: string;
  }[];
  provable_vs_speculative: {
    provable: string[];
    speculative: string[];
    unknown: string[];
  };
};
```

### 4. Talking Points

```typescript
export type TalkingPoints = {
  short_30s: {
    text: string;
    key_facts: string[];            // 2-3 facts max
    safe_language: string[];        // avoid these words
  };
  medium_60s: {
    text: string;
    structure: {
      hook: string;
      facts: string[];
      reframe: string;
    };
  };
  long_form: {
    text: string;
    structure: {
      context: string;
      evidence_summary: string;
      misrepresentation_analysis: string;
      democratic_implications: string;
      call_to_action: string;
    };
  };
  language_guidance: {
    safe_phrases: string[];
    risky_phrases: string[];
    replacement_map: Record<string, string>;
  };
};
```

### 5. Propaganda Pattern Map

```typescript
export type PropagandaPattern = {
  pattern_id: string;
  name: string;                     // e.g., "Scapegoating"
  description: string;
  detected_in_content: boolean;
  examples_from_content: string[];
  psychological_mechanism: string;   // Why it works
  historical_usage: {
    context: string;
    year?: number;
    outcome?: string;
  }[];
  disruption_strategy: string;       // How to counter it
  safe_counter_language: string[];
};

export type PropagandaPatternMap = {
  patterns_detected: PropagandaPattern[];
  overall_sophistication: 'low' | 'medium' | 'high';
  primary_tactic: string;
  secondary_tactics: string[];
  effectiveness_estimate: number;    // 0-1
  vulnerability_assessment: {
    who_is_targeted: string[];
    why_effective: string;
    counter_measures: string[];
  };
};
```

### 6. Action Framing

```typescript
export type ActionFraming = {
  impact_on: {
    voters: string;
    workers: string;
    families: string;
    marginalized_communities: string;
    democratic_norms: string;
  };
  institutional_response: {
    what_should_happen: string[];
    responsible_parties: string[];
    accountability_mechanisms: string[];
  };
  citizen_action: {
    legal_actions: string[];
    civic_engagement: string[];
    information_sharing: string[];
  };
  platform_accountability: {
    platforms_involved: string[];
    policy_violations: string[];
    enforcement_requests: string[];
  };
};
```

### 7. Enhanced Analysis Result

```typescript
export type Tier3AnalysisResult = AnalysisResult & {
  tier: 3;
  multi_platform_evidence: MultiPlatformEvidence[];
  narrative_frames: NarrativeFrame[];
  receipt_pack: ReceiptPack;
  talking_points: TalkingPoints;
  propaganda_pattern_map: PropagandaPatternMap;
  action_framing: ActionFraming;
  processing_metadata: {
    platforms_analyzed: PlatformSource[];
    total_sources: number;
    analysis_duration_ms: number;
    confidence_score: number;
  };
};
```

---

## New Modules to Build

### 1. YouTube Transcript Fetcher

**File:** `lib/youtube-transcript.ts`

**Purpose:** Fetch and parse YouTube video transcripts

**Dependencies:**
- `youtube-transcript` (npm package) or YouTube Data API v3
- Rate limiting
- Error handling for videos without transcripts

**Key functions:**
- `fetchTranscript(videoUrl: string): Promise<string>`
- `extractVideoId(url: string): string | null`
- `parseTimestamps(transcript: string): TimestampedSegment[]`

---

### 2. Reddit Scraper

**File:** `lib/reddit-scraper.ts`

**Purpose:** Fetch high-signal Reddit threads and comments

**Dependencies:**
- Reddit API (PRAW or snoowrap)
- Authentication (read-only OAuth)
- Rate limiting (60 requests per minute)

**Key functions:**
- `scrapePost(postUrl: string): Promise<RedditPost>`
- `scrapeComments(postId: string, minUpvotes: number): Promise<Comment[]>`
- `extractClaims(comments: Comment[]): string[]`

**Important:** Only fetch high-signal threads (upvotes > threshold)

---

### 3. Narrative Analyzer

**File:** `lib/narrative-analyzer.ts`

**Purpose:** Identify narrative-level framing and clustering

**Key functions:**
- `identifyNarratives(claims: Claim[], evidence: MultiPlatformEvidence[]): NarrativeFrame[]`
- `clusterByNarrative(claims: Claim[]): Map<string, Claim[]>`
- `assessFramingRisk(narrative: NarrativeFrame): number`
- `generateCounterNarrative(narrative: NarrativeFrame): string`

**Algorithm:**
1. Group claims by semantic similarity
2. Identify common framing techniques
3. Map to known propaganda patterns
4. Assess psychological hooks
5. Generate counter-narratives

---

### 4. Receipt Pack Generator

**File:** `lib/receipt-pack.ts`

**Purpose:** Generate commentary-ready receipt packs

**Key functions:**
- `generateReceiptPack(analysis: Tier3AnalysisResult): ReceiptPack`
- `extractTopFacts(claims: Claim[], minConfidence: number): Fact[]`
- `identifyMisrepresentations(claims: Claim[], evidence: Evidence[]): Misrepresentation[]`
- `buildAttributionTimeline(evidence: MultiPlatformEvidence[]): Attribution[]`

---

### 5. Talking Points Generator

**File:** `lib/talking-points.ts`

**Purpose:** Generate tier-specific talking points

**Key functions:**
- `generate30SecondTalkingPoint(receiptPack: ReceiptPack): string`
- `generate60SecondTalkingPoint(receiptPack: ReceiptPack, narratives: NarrativeFrame[]): string`
- `generateLongFormTalkingPoint(analysis: Tier3AnalysisResult): string`
- `suggestSafeLanguage(text: string): LanguageGuidance`

---

### 6. Propaganda Pattern Matcher

**File:** `lib/propaganda-patterns.ts`

**Purpose:** Match detected tactics to known propaganda patterns

**Database:** `lib/propaganda-pattern-db.ts`
- Collection of known patterns
- Historical examples
- Psychological mechanisms
- Counter-strategies

**Key functions:**
- `detectPatterns(tactics: string[], claims: Claim[]): PropagandaPattern[]`
- `assessSophistication(patterns: PropagandaPattern[]): string`
- `generateDisruptionStrategy(pattern: PropagandaPattern): string`

---

### 7. Action Framing Engine

**File:** `lib/action-framing.ts`

**Purpose:** Frame implications and actions

**Key functions:**
- `assessImpactOn(analysis: Tier3AnalysisResult, stakeholder: string): string`
- `suggestInstitutionalResponse(analysis: Tier3AnalysisResult): string[]`
- `generateCitizenActions(analysis: Tier3AnalysisResult): string[]`
- `identifyPlatformAccountability(evidence: MultiPlatformEvidence[]): string[]`

---

## Implementation Phases

### Phase 1: Multi-Platform Ingestion (4 weeks)
- [ ] YouTube transcript fetcher
- [ ] Reddit scraper
- [ ] Social thread parser
- [ ] Official source fetcher (.gov, court docs)
- [ ] Unified ingestion pipeline

### Phase 2: Narrative Analysis (3 weeks)
- [ ] Narrative identification
- [ ] Framing analysis enhancement
- [ ] Semantic clustering
- [ ] Counter-narrative generation

### Phase 3: Commentary Outputs (4 weeks)
- [ ] Receipt pack generator
- [ ] Talking points generator (3 tiers)
- [ ] Language safety checker
- [ ] Citation builder

### Phase 4: Pattern Matching (3 weeks)
- [ ] Propaganda pattern database
- [ ] Pattern matching engine
- [ ] Historical precedent lookup
- [ ] Disruption strategy generator

### Phase 5: Action Framing (2 weeks)
- [ ] Impact assessment
- [ ] Institutional response suggestions
- [ ] Citizen action generator
- [ ] Platform accountability tracker

### Phase 6: Integration & Polish (2 weeks)
- [ ] API design
- [ ] UI for Tier 3 outputs
- [ ] Export functionality
- [ ] Performance optimization

**Total estimated time:** 18 weeks (4.5 months)

---

## API Design

### Tier 3 Analysis Endpoint

```typescript
POST /api/analyze/tier3

Request:
{
  "input": {
    "type": "url" | "text" | "thread" | "video",
    "content": string,
    "options": {
      "includePlatforms": ["news", "youtube", "reddit", "official"],
      "maxSources": number,
      "includeHistoricalPatterns": boolean
    }
  }
}

Response:
{
  "analysis": Tier3AnalysisResult,
  "processing_time_ms": number,
  "sources_analyzed": number,
  "disclaimer": string
}
```

---

## Rate Limiting

### Tier 3 Limits
- 50 analyses per day
- 10 concurrent requests
- YouTube: 100 transcripts per day
- Reddit: 500 posts per day
- Priority queue for paying users

---

## Cost Considerations

### External API Costs
- YouTube Data API: Free (10,000 units/day, ~100 videos)
- Reddit API: Free (60 requests/min)
- LLM calls (GPT-4): ~$0.10 per analysis
- Search API (Brave): ~$0.005 per search

### Estimated Cost per Tier 3 Analysis
- Multi-platform ingestion: $0.02
- LLM processing: $0.15
- Search queries: $0.05
- **Total: ~$0.22 per analysis**

### Pricing Implications
- At $50/mo, need ~225 analyses to break even
- At $100/mo, need ~450 analyses to break even
- Most users will do 5-20 analyses per month
- **Profitable at scale**

---

## Guardrails Implementation

### Fact vs Interpretation Separator

```typescript
export function separateFactFromInterpretation(text: string): {
  facts: string[];
  interpretations: string[];
  confidence: number;
} {
  // Use LLM to classify each statement
  // Facts: directly verifiable
  // Interpretations: analysis, conclusions, predictions
}
```

### Language Safety Checker

```typescript
export function checkLanguageSafety(text: string): {
  safe: boolean;
  issues: string[];
  suggestions: string[];
} {
  // Check for:
  // - Character attacks without direct evidence
  // - Inflammatory language
  // - Unsubstantiated claims about intent
  // - Partisan framing
}
```

### Citation Validator

```typescript
export function validateCitations(text: string, sources: Evidence[]): {
  valid: boolean;
  uncitedClaims: string[];
  missingSources: string[];
} {
  // Ensure every factual claim has a citation
}
```

---

## Testing Strategy

### Unit Tests
- Each module independently tested
- Mock external APIs (YouTube, Reddit)
- Test edge cases (no transcript, deleted posts)

### Integration Tests
- Full pipeline from input to output
- Multiple platform types
- Narrative clustering accuracy

### Quality Tests
- Language safety validation
- Citation completeness
- Reading level assessment
- Fact vs interpretation accuracy

### Performance Tests
- Response time < 30 seconds
- Concurrent user handling
- Rate limiting effectiveness

---

## Monitoring & Observability

### Metrics to Track
- Analysis completion rate
- Average processing time
- Platform success rates (YouTube, Reddit)
- User satisfaction scores
- Export/citation usage
- Revenue per user

### Alerts
- API rate limit warnings
- External API failures
- Processing timeout errors
- Cost anomalies

---

## Legal Considerations

### Required Disclaimers

Every Tier 3 output must include:

> **Disclaimer:** This analysis is provided for informational purposes and constitutes protected speech under the First Amendment. All conclusions are evidence-based interpretations derived from cited sources. Users are responsible for verifying information and drawing their own conclusions.

### Terms of Service Requirements
- Users must agree not to use for defamation
- Must agree to cite sources when using analysis
- Platform has right to terminate abuse
- No warranty on accuracy (best effort)

### DMCA Compliance
- Respect robots.txt
- Fair use excerpts only
- Link to original sources
- Remove on takedown request

---

## Success Metrics for Tier 3

### Usage Metrics
- Analyses per user per month
- Platform coverage per analysis
- Export/share rate
- Citation builder usage

### Quality Metrics
- User-reported accuracy
- Fact-check validation rate
- Language safety score
- Citation completeness

### Business Metrics
- Conversion from Tier 2 → Tier 3
- Monthly recurring revenue
- Churn rate
- Net Promoter Score

### Impact Metrics
- Content published using platform
- User credibility maintained
- Misinformation countered
- Democratic discourse improved

---

## Next Steps

1. **Week 1-2:** Design database schema for multi-platform evidence
2. **Week 3-4:** Build YouTube transcript fetcher
3. **Week 5-6:** Build Reddit scraper
4. **Week 7-8:** Implement narrative analyzer
5. **Week 9-12:** Build output generators (receipts, talking points, patterns)
6. **Week 13-14:** Implement action framing
7. **Week 15-16:** Integration testing
8. **Week 17-18:** UI/UX for Tier 3

---

**Remember:** This is not "fighting propaganda." This is **empowering evidence-based discourse for people who take democracy seriously.**
