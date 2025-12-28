# Evidence Retrieval Implementation Summary

✅ **COMPLETE** - All requirements implemented and tested

## What Was Implemented

### 1. Search Client Interface ✅

**Location:** [lib/search-client.ts](lib/search-client.ts)

```typescript
interface SearchClient {
  search(query: string, excluded_domains: string[], max_results: number): Promise<SearchResponse>;
  isAvailable(): boolean;
}
```

**Features:**
- Clean abstraction for search backends
- Support for domain exclusion
- Configurable result limits
- Availability check method

### 2. Backend Integrations ✅

#### Brave Search API Backend
- **Status:** Fully integrated
- **Activation:** Enabled when `BRAVE_SEARCH_API_KEY` is present
- **Features:** 
  - Domain exclusion (`-site:example.com`)
  - Safe search
  - Result filtering and deduplication
  - Error handling

#### Stub Backend
- **Status:** Implemented
- **Activation:** Used when no API key configured
- **Behavior:**
  - Returns empty array (`[]`)
  - Logs search attempts to console
  - Sets `verifiability_status = NOT_RUN`
  - Provides message: "Missing API key"

### 3. Query Building ✅

**Function:** `build_queries_for_claim(claim)`

**Strategy:** Generates 1-3 optimized queries per claim:
1. Direct claim search
2. Number/statistic focused searches
3. Entity (proper noun) focused searches
4. Quoted phrase searches

**Example:**
```typescript
Input:  'Inflation rose to 8.5 percent in March 2024'
Output: [
  'Inflation rose to 8.5 percent in March 2024',
  '8.5 Inflation rose to 8.5 percent...',
  'Inflation March'
]
```

### 4. Evidence Retrieval ✅

**Function:** `retrieve_evidence_for_claim(claim, excluded_domains)`

**Process:**
1. ✅ Build multiple queries
2. ✅ Search with each query
3. ✅ Deduplicate by URL
4. ✅ Filter bad citations (homepages, terms pages)
5. ✅ Filter to 60+ reputable sources only
6. ✅ Deduplicate by domain
7. ✅ Return top 6 results

**Reputable Sources Include:**
- News agencies (Reuters, AP, AFP, BBC)
- Major newspapers (NYT, WaPo, Guardian)
- Government (.gov, .edu, who.int)
- Academic (nature.com, science.org)
- Fact-checking (Snopes, FactCheck.org)

### 5. EvidenceItem Creation ✅

**Function:** `scoreEvidence(claim, sources, attributionType?)`

**Returns:** Array of EvidenceItem objects with structure:

```typescript
{
  url: string;                    // Full URL to source
  title: string;                  // Article title
  publisher: string;              // Domain (e.g., "reuters.com")
  published_at?: string;          // ISO date (parsed from age)
  snippet: string;                // Search result snippet
  supports_claim: boolean;        // Set by stance analysis
  confidence: number;             // 0-1, based on relevance + credibility
}
```

**Confidence Calculation:**
```
baseConfidence = (relevance × 0.7) + (credibility × 0.3)
+ attributionBoost (0.2-0.3)
= final confidence (0.2-1.0)
```

### 6. Evidence Summary Updates ✅

**Calculated automatically in API route:**

```typescript
evidenceSummary: {
  totalSources: number;          // Count of evidence items
  uniqueDomains: number;         // Distinct publishers
  supportingCount: number;       // Sources that support claim
  refutingCount: number;         // Sources that refute claim
  averageCredibility: number;    // Mean credibility (0-1)
}
```

**Usage:**
- `uniqueDomains < 2` → Forces "Insufficient evidence" verdict
- `uniqueDomains >= 2` → Enables corroboration scoring
- `averageCredibility` → Affects verifiability score

### 7. Verifiability Status ✅

Three distinct statuses properly implemented:

| Status | Score | Condition | Message |
|--------|-------|-----------|---------|
| `NOT_RUN` | `null` | No API key | "Evidence retrieval not run (missing API key or disabled)." |
| `NO_EVIDENCE_FOUND` | `0` | Search ran, no results | "Evidence retrieval ran but no sources were found." |
| `EVIDENCE_FOUND` | `0-100` | Evidence retrieved | (no message) |

**UI Display:**
- `NOT_RUN`: Yellow banner, "N/A/100"
- `NO_EVIDENCE_FOUND`: Red banner, "0/100"
- `EVIDENCE_FOUND`: Color-coded score with breakdown

## Testing Coverage

✅ **112 tests passing** (6 test suites)

### New Tests Added
[__tests__/evidence-retrieval.test.ts](__tests__/evidence-retrieval.test.ts) - 11 tests:
- Complete evidence retrieval flow
- Evidence summary calculations
- Status handling (NOT_RUN, NO_EVIDENCE_FOUND, EVIDENCE_FOUND)
- EvidenceItem structure validation
- Confidence calculation with attribution boost
- Domain exclusion functionality

### Existing Tests (Still Passing)
- `search-client.test.ts` - 49 tests
- `verifiability.test.ts` - 8 tests
- `attribution.test.ts` - 15 tests
- `html-parser.test.ts` - 24 tests
- `models.test.ts` - 5 tests

## Documentation Created

1. ✅ [EVIDENCE_RETRIEVAL.md](EVIDENCE_RETRIEVAL.md) - Complete technical documentation
2. ✅ [EVIDENCE_FLOW.md](EVIDENCE_FLOW.md) - Visual flow diagram
3. ✅ [examples/evidence-retrieval-examples.ts](examples/evidence-retrieval-examples.ts) - 8 code examples

## Key Files Modified/Created

| File | Status | Changes |
|------|--------|---------|
| `lib/search-client.ts` | ✅ Existing | Already implemented (verified) |
| `lib/evidence.ts` | ✅ Existing | Already implemented (verified) |
| `lib/verifiability.ts` | ✅ Existing | Status handling verified |
| `app/api/analyze/route.ts` | ✅ Existing | Integration verified |
| `__tests__/evidence-retrieval.test.ts` | ✅ Created | New comprehensive tests |
| `EVIDENCE_RETRIEVAL.md` | ✅ Created | Full documentation |
| `EVIDENCE_FLOW.md` | ✅ Created | Visual diagram |
| `examples/evidence-retrieval-examples.ts` | ✅ Created | Usage examples |

## How It Works

### Without API Key
```
User Input → Extract Claims → retrieve_evidence_for_claim()
             ↓
          StubSearchClient.search() → []
             ↓
          scoreEvidence([]) → []
             ↓
          calculateOverallVerifiability(claims, searchEnabled=false)
             ↓
          { status: 'NOT_RUN', score: null, message: '...' }
             ↓
          UI: "N/A/100" 🟨 Yellow Banner
```

### With API Key
```
User Input → Extract Claims → retrieve_evidence_for_claim()
             ↓
          BraveSearchClient.search() → SearchResult[]
             ↓
          Filter to reputable sources → SearchResult[]
             ↓
          scoreEvidence(results) → EvidenceItem[]
             ↓
          analyzeSourceStance() → Update supports_claim
             ↓
          Calculate evidenceSummary
             ↓
          calculateOverallVerifiability(claims, searchEnabled=true)
             ↓
          { status: 'EVIDENCE_FOUND', score: 0-100, breakdown: {...} }
             ↓
          UI: "75/100" with evidence list
```

## Configuration

### Required Environment Variables

```bash
# For evidence retrieval
BRAVE_SEARCH_API_KEY=your_api_key_here

# For AI analysis
OPENAI_API_KEY=your_openai_key_here
```

### Getting API Keys

**Brave Search:**
1. Visit https://brave.com/search/api/
2. Sign up for API access
3. Copy API key to `.env.local`

**OpenAI:**
1. Visit https://platform.openai.com/
2. Create API key
3. Copy to `.env.local`

## Verification

✅ Build successful
```bash
npm run build
# ✓ Compiled successfully
```

✅ All tests passing
```bash
npm test
# Test Suites: 6 passed, 6 total
# Tests:       112 passed, 112 total
```

## Next Steps

The system is production-ready. To use:

1. **Set environment variables:**
   ```bash
   cp .env.example .env.local
   # Add BRAVE_SEARCH_API_KEY
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Test evidence retrieval:**
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"input":"https://apnews.com/article/..."}'
   ```

## Architecture Highlights

- ✅ Clean interface abstraction (SearchClient)
- ✅ Multiple backend support (Brave + Stub)
- ✅ Graceful degradation (works without API key)
- ✅ Quality filtering (60+ reputable sources)
- ✅ Deduplication (URL + domain)
- ✅ Confidence scoring (relevance + credibility + attribution)
- ✅ Stance analysis (GPT-4o-mini)
- ✅ Status tracking (NOT_RUN vs NO_EVIDENCE_FOUND vs EVIDENCE_FOUND)
- ✅ Comprehensive testing (112 tests)
- ✅ Full documentation

## Performance

- **Query limit:** 3 queries per claim (prevents rate limiting)
- **Result limit:** 6 results per claim (quality over quantity)
- **Deduplication:** By URL and domain
- **Filtering:** Bad citations and non-reputable sources removed
- **Timeout:** 10 seconds for HTML fetching

## Error Handling

- API failures → Return empty results, log error
- Network errors → Return empty results, log error
- Invalid URLs → Filtered out during processing
- Parse errors → Handled with sensible defaults
- Missing API key → Clear status and message to user
