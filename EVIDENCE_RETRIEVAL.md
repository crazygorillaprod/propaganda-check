# External Evidence Retrieval Implementation

## Overview

This document describes the complete external evidence retrieval system that integrates search APIs, scores evidence, and updates verifiability status.

## Architecture

### 1. Search Client Interface

Located in [lib/search-client.ts](lib/search-client.ts)

```typescript
export interface SearchClient {
  search(query: string, excluded_domains: string[], max_results: number): Promise<SearchResponse>;
  isAvailable(): boolean;
}

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  age?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  backend: 'brave' | 'stub';
};
```

### 2. Backend Implementations

#### Brave Search API Backend

Integrates with Brave Search API when `BRAVE_SEARCH_API_KEY` is present:

```typescript
class BraveSearchClient implements SearchClient {
  async search(query: string, excluded_domains: string[], max_results: number) {
    // Builds query with domain exclusions
    // Calls Brave Search API
    // Returns SearchResponse with 'brave' backend
  }
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
```

**Features:**
- Domain exclusion support (e.g., `-site:example.com`)
- Configurable result limits (max 20)
- Safe search enabled
- Error handling with fallback to empty results

#### Stub Backend

Used when no API key is configured:

```typescript
class StubSearchClient implements SearchClient {
  async search(query: string, excluded_domains: string[], max_results: number) {
    console.log(`[SEARCH DISABLED] Missing API key. Would search: "${query}"`);
    return { query, results: [], backend: 'stub' };
  }
  
  isAvailable(): boolean {
    return false;
  }
}
```

**Behavior:**
- Returns empty results array
- Logs would-be searches to console
- Triggers `NOT_RUN` status in verifiability scoring

### 3. Query Building

Located in [lib/search-client.ts](lib/search-client.ts)

```typescript
export function build_queries_for_claim(claim: string): string[]
```

**Strategy:** Generates 1-3 search queries per claim:
1. **Direct claim search** - Full claim text
2. **Number-focused search** - Extracts numbers/percentages for specific searches
3. **Entity-focused search** - Extracts proper nouns (names, places, organizations)
4. **Quoted phrase search** - Uses exact phrases when present

**Example:**
```typescript
Input: 'Inflation rose to 8.5 percent in March 2024'
Output: [
  'Inflation rose to 8.5 percent in March 2024',
  '8.5 Inflation rose to 8.5 percent...',
  'Inflation March'
]
```

### 4. Evidence Retrieval

Located in [lib/search-client.ts](lib/search-client.ts)

```typescript
export async function retrieve_evidence_for_claim(
  claim: string,
  excluded_domains: string[] = []
): Promise<SearchResult[]>
```

**Process:**
1. Builds multiple queries using `build_queries_for_claim()`
2. Searches with each query
3. Deduplicates by URL
4. Filters out bad citations (homepages, terms pages, hub pages)
5. Filters to reputable sources only
6. Deduplicates by domain (keeps best result per domain)
7. Returns top 6 results

**Reputable Sources:** 60+ domains including:
- News agencies: Reuters, AP, AFP
- Major newspapers: NYT, Washington Post, Guardian, BBC
- Government: .gov, .gov.uk, who.int, cdc.gov
- Academic: .edu, nature.com, science.org
- Fact-checking: Snopes, FactCheck.org, PolitiFact

### 5. Evidence Scoring

Located in [lib/evidence.ts](lib/evidence.ts)

```typescript
export async function scoreEvidence(
  claim: string,
  sources: RawSource[],
  attributionType?: AttributionType
): Promise<EvidenceItem[]>
```

**Converts SearchResults to EvidenceItems with:**

```typescript
type EvidenceItem = {
  url: string;
  title: string;
  publisher: string;         // Domain without www
  published_at?: string;     // ISO date parsed from age
  snippet: string;
  supports_claim: boolean;   // Set by analyzeSourceStance
  confidence: number;        // 0-1, calculated from relevance + credibility
}
```

**Confidence Calculation:**
```
baseConfidence = (relevance * 0.7) + (credibility * 0.3)
confidence = min(max(baseConfidence + attributionBoost, 0.2), 1.0)
```

**Credibility Scoring:**
- High credibility (0.9): gov, edu, reuters.com, apnews.com, bbc.com, nature.com
- Medium credibility (0.6): cnn.com, nytimes.com, washingtonpost.com
- Low credibility (0.3): blog, medium.com, twitter.com, reddit.com
- Unknown (0.5): default

**Attribution Boost:**
- DIRECT_QUOTE: +0.3 confidence
- OFFICIAL_STATEMENT: +0.25 confidence
- REPORTED_SPEECH: +0.2 confidence

### 6. Stance Analysis

Located in [lib/evidence.ts](lib/evidence.ts)

```typescript
export async function analyzeSourceStance(
  claim: string,
  evidence: EvidenceItem[],
  openai: OpenAI
): Promise<EvidenceItem[]>
```

Uses GPT-4o-mini to determine if each source:
- **supports** - Evidence confirms the claim
- **refutes** - Evidence contradicts the claim
- **neutral** - Evidence is related but doesn't take a stance
- **unclear** - Cannot determine stance from snippet

Updates `supports_claim` field based on stance.

### 7. Evidence Summary

Calculated in [app/api/analyze/route.ts](app/api/analyze/route.ts)

```typescript
type EvidenceSummary = {
  totalSources: number;        // Total evidence items found
  uniqueDomains: number;       // Distinct publishers
  supportingCount: number;     // Sources that support claim
  refutingCount: number;       // Sources that refute claim
  averageCredibility: number;  // Mean credibility score (0-1)
}
```

**Usage in verifiability scoring:**
- `uniqueDomains < 2` → Forces verdict to "Insufficient evidence"
- `uniqueDomains >= 2` → Enables corroboration score
- `averageCredibility` → Affects first corroboration score (0-30)

### 8. Verifiability Status

Located in [lib/verifiability.ts](lib/verifiability.ts)

```typescript
export type VerifiabilityStatus = 'NOT_RUN' | 'NO_EVIDENCE_FOUND' | 'EVIDENCE_FOUND';
```

**Status Logic:**

```typescript
if (!searchEnabled) {
  return {
    status: 'NOT_RUN',
    score: null,  // Important: null, not 0
    message: 'Evidence retrieval not run (missing API key or disabled).'
  };
}

if (totalEvidence === 0) {
  return {
    status: 'NO_EVIDENCE_FOUND',
    score: 0,
    message: 'Evidence retrieval ran but no sources were found.'
  };
}

// Otherwise
return {
  status: 'EVIDENCE_FOUND',
  score: calculatedScore,  // 0-100
  // no message
};
```

**Key Distinction:**
- `NOT_RUN` (null score) - Search disabled or API key missing
- `NO_EVIDENCE_FOUND` (0 score) - Search ran successfully but returned no results
- `EVIDENCE_FOUND` (calculated score) - Evidence retrieved and scored

### 9. API Integration

Located in [app/api/analyze/route.ts](app/api/analyze/route.ts)

**Complete Flow:**

```typescript
// 1. Check if search is enabled
const searchClient = getSearchClient();
const searchEnabled = searchClient.isAvailable();

// 2. For each claim, retrieve evidence
for (const claim of claims) {
  // Retrieve evidence using new search client
  const evidenceResults = await retrieve_evidence_for_claim(
    claim.text,
    inputDomain ? [inputDomain] : []
  );
  
  // Score evidence for relevance and credibility
  claim.evidence = await scoreEvidence(
    claim.text, 
    evidenceResults, 
    claim.attribution_type
  );
  
  // Analyze stance of each source
  claim.evidence = await analyzeSourceStance(claim.text, claim.evidence, openai);
  
  // Calculate evidence summary
  claim.evidenceSummary = {
    totalSources: claim.evidence.length,
    uniqueDomains: new Set(claim.evidence.map(e => e.publisher)).size,
    supportingCount: claim.evidence.filter(e => e.supports_claim).length,
    refutingCount: claim.evidence.filter(e => e.stanceTowardsClaim === 'refutes').length,
    averageCredibility: /* calculated */,
  };
}

// 3. Calculate overall verifiability with search status
const overallVerifiability = calculateOverallVerifiability(claims, searchEnabled);
```

## Configuration

### Environment Variables

```bash
# Required for evidence retrieval
BRAVE_SEARCH_API_KEY=your_brave_search_api_key

# Required for AI analysis
OPENAI_API_KEY=your_openai_api_key
```

**Without BRAVE_SEARCH_API_KEY:**
- Search client returns stub implementation
- `retrieve_evidence_for_claim()` returns `[]`
- Verifiability status set to `NOT_RUN`
- UI displays "N/A/100" with yellow banner

## Testing

See [__tests__/evidence-retrieval.test.ts](__tests__/evidence-retrieval.test.ts) for comprehensive integration tests covering:

1. **Complete evidence retrieval flow**
   - Query building
   - Evidence retrieval
   - Evidence scoring
   - EvidenceItem structure validation

2. **Evidence summary calculations**
   - Total sources
   - Unique domains
   - Supporting/refuting counts
   - Average credibility

3. **Verifiability status handling**
   - NOT_RUN (no API key)
   - NO_EVIDENCE_FOUND (search ran, no results)
   - EVIDENCE_FOUND (evidence retrieved)

4. **EvidenceItem structure validation**
   - Required fields
   - Confidence calculation
   - Attribution boost

**Test Results:** 112/112 tests passing ✓

## UI Integration

Located in [app/page.tsx](app/page.tsx)

**Status Display:**

```typescript
if (status === 'NOT_RUN') {
  // Yellow banner
  // Score displays as "N/A/100"
  // Message: "Evidence Retrieval Not Run"
}

if (status === 'NO_EVIDENCE_FOUND') {
  // Red banner
  // Score displays as "0/100"
  // Message: "Evidence retrieval ran but no sources were found."
}

if (status === 'EVIDENCE_FOUND') {
  // Normal score display with color coding
  // Shows score breakdown
  // Lists evidence with stance indicators
}
```

## Performance Considerations

1. **Query Limits:** Max 3 queries per claim to avoid rate limiting
2. **Result Limits:** Max 8 results per query, filtered to top 6
3. **Domain Deduplication:** Prevents overrepresentation of single sources
4. **Reputable Source Filtering:** Ensures quality over quantity
5. **Timeouts:** 10-second timeout for HTML fetching
6. **Caching:** Search client singleton prevents redundant initialization

## Error Handling

- **API failures:** Return empty results, log error
- **Network errors:** Return empty results, log error
- **Invalid URLs:** Filter out during deduplication
- **Parse errors:** Gracefully handle with defaults
- **Rate limiting:** Not implemented (future consideration)

## Future Enhancements

1. **Caching layer** for search results
2. **Rate limiting protection**
3. **Multi-provider fallback** (Google, Bing)
4. **Document retrieval** for deep analysis
5. **Real-time fact database** integration
6. **Citation quality scoring** beyond domain reputation
