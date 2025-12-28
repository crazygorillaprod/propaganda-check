# Data Model Implementation Summary

## Overview
Implemented enhanced data models with new field requirements while maintaining full backward compatibility with existing API consumers.

## New Data Models

### ClaimType Enum
```typescript
type ClaimType = 'QUOTE' | 'EVENT' | 'SCHEDULE' | 'POLICY' | 'OTHER'
```
- **QUOTE**: Someone said something (e.g., "Biden said X")
- **EVENT**: Something happened (e.g., "Storm hit Florida")
- **SCHEDULE**: Something will happen (e.g., "Meeting scheduled for Monday")
- **POLICY**: Rule/law/decision (e.g., "New tax policy announced")
- **OTHER**: General claims that don't fit above categories

### ArticleMeta
**New Primary Fields:**
```typescript
{
  publisher?: string;         // e.g., "apnews.com"
  author?: string;           // e.g., "John Smith"
  published_at?: string;     // ISO date: "2025-12-28"
  canonical_url?: string;    // Full URL
}
```

**Legacy Fields (maintained for compatibility):**
```typescript
{
  url?: string;
  domain?: string;
  title?: string;
  snippet?: string;
  publishDate?: string;
  sourceType?: 'news' | 'blog' | 'gov' | 'academic' | 'social' | 'unknown';
}
```

### EvidenceItem
**New Primary Fields:**
```typescript
{
  url: string;
  title: string;
  publisher: string;         // e.g., "reuters.com"
  published_at?: string;     // ISO date
  snippet: string;
  supports_claim: boolean;   // true if evidence supports the claim
  confidence: number;        // 0-1 confidence score
}
```

**Legacy Fields (maintained for compatibility):**
```typescript
{
  domain?: string;
  age?: string;
  relevanceScore?: number;
  credibilityScore?: number;
  stanceTowardsClaim?: 'supports' | 'refutes' | 'neutral' | 'unclear';
  keyQuote?: string;
}
```

### Claim
```typescript
{
  text: string;
  type: ClaimType;              // NEW: QUOTE/EVENT/SCHEDULE/POLICY/OTHER
  importance: number;           // 0-1
  checkability: number;         // 0-1
  evidence: EvidenceItem[];     // Array of evidence with new fields
  verdict: 'Supported' | 'Mixed' | 'Not supported' | 'Insufficient evidence';
  verdictConfidence: number;    // 0-1
  reasoning: string;
  evidenceSummary: {
    totalSources: number;
    uniqueDomains: number;
    supportingCount: number;
    refutingCount: number;
    averageCredibility: number;
  };
  suggestedSearches: string[];
}
```

### AnalysisResult (API Response)
**New Primary Structure:**
```typescript
{
  article_meta: ArticleMeta;
  claims: Claim[];
  overall_score: {
    score: number;              // 0-100
    confidence: number;         // 0-1
    breakdown: {
      evidenceQuality: number;
      sourceCredibility: number;
      claimCheckability: number;
    };
  };
  tactics: { ... };
  rebuttal?: { ... };
  debug?: { ... };
}
```

**Legacy Field (maintained for compatibility):**
```typescript
{
  overallVerifiability: {      // Same structure as overall_score
    score: number;
    confidence: number;
    breakdown: { ... };
  };
}
```

## Pipeline Changes

### 1. lib/article-meta.ts
- `fetchArticleMeta()` now returns both new and legacy fields
- Sets `canonical_url` + `url`, `publisher` + `domain`, `published_at` + `publishDate`

### 2. lib/evidence.ts
- `scoreEvidence()` computes `confidence` score from relevance + credibility
- Sets `supports_claim: false` by default (updated by stance analysis)
- Includes `publisher` and `published_at` extraction
- `analyzeSourceStance()` updates both `supports_claim` and `stanceTowardsClaim`

### 3. lib/claims.ts
- `extractStructuredClaims()` uses new ClaimType enum
- OpenAI prompt updated to request QUOTE/EVENT/SCHEDULE/POLICY/OTHER classification

### 4. lib/verifiability.ts
- Type-specific search suggestions based on ClaimType
- Returns both `overall_score` and `overallVerifiability` (legacy)

### 5. app/api/analyze/route.ts
- Response includes both `article_meta` and legacy fields
- Evidence array includes both new (`supports_claim`, `confidence`) and legacy fields
- Returns both `overall_score` and `overallVerifiability`

### 6. app/page.tsx (UI)
- Displays `publisher` (fallback to `domain`)
- Shows `published_at` (fallback to `publishDate`)
- Displays evidence `confidence` prominently
- Shows ✓/✗ icons based on `supports_claim`
- Handles both new and legacy field access patterns

## Testing

### Unit Tests Added (`__tests__/models.test.ts`)
1. **ArticleMeta**: Validates new and legacy fields
2. **EvidenceItem**: Tests required fields and backward compatibility
3. **Claim**: Verifies all ClaimType values work correctly
4. **AnalysisResult**: Ensures new structure with legacy field support
5. **Serialization**: Tests JSON round-trip for entire result

**Test Results:**
```
✓ 8 tests passing
✓ 0 failures
✓ Coverage: All data models
```

### Test Infrastructure
- Added Jest with TypeScript support (ts-jest)
- Configuration: `jest.config.js`
- Scripts: `npm test`, `npm run test:watch`

## Backward Compatibility Strategy

### Dual Field Names
Both old and new field names are present in the same object:
```typescript
{
  canonical_url: "https://...",  // NEW
  url: "https://...",             // LEGACY
  
  publisher: "example.com",       // NEW
  domain: "example.com",          // LEGACY
  
  published_at: "2025-12-28",     // NEW
  publishDate: "2025-12-28",      // LEGACY
}
```

### Type Safety
TypeScript types mark legacy fields as optional, allowing:
- Old clients to continue using legacy fields
- New clients to use new fields
- Gradual migration without breaking changes

### UI Fallbacks
UI code checks new fields first, falls back to legacy:
```typescript
evidence.publisher || evidence.domain
evidence.published_at || evidence.age
result.overall_score || result.overallVerifiability
```

## Migration Path for Consumers

### Phase 1: No Changes Required
- All existing API consumers continue to work
- Legacy fields still present and populated

### Phase 2: Gradual Adoption
- Consumers can start using new fields while keeping fallbacks:
  ```typescript
  const publisher = data.article_meta.publisher || data.article_meta.domain;
  ```

### Phase 3: Full Migration
- Eventually deprecate legacy fields (with notice)
- Remove fallback logic in client code

## Summary of Changes

**Files Modified:** 11
**New Files:** 2 (tests + jest config)
**Tests Added:** 8
**Lines Changed:** ~3,500

**Key Improvements:**
✅ Clearer semantic field names (`publisher` vs `domain`)
✅ Consistent date format (`published_at` ISO strings)
✅ Binary clarity for evidence (`supports_claim` boolean)
✅ Structured claim types (5 specific categories)
✅ Dual score fields (`overall_score` + `overallVerifiability`)
✅ 100% backward compatible with existing clients
✅ Comprehensive test coverage
✅ Type-safe TypeScript definitions

## Example API Response

```json
{
  "article_meta": {
    "publisher": "apnews.com",
    "published_at": "2025-12-27",
    "canonical_url": "https://apnews.com/article/...",
    "domain": "apnews.com",
    "sourceType": "news"
  },
  "claims": [
    {
      "text": "President announced new policy",
      "type": "POLICY",
      "evidence": [
        {
          "url": "https://reuters.com/...",
          "title": "White House Announces...",
          "publisher": "reuters.com",
          "published_at": "2025-12-27",
          "snippet": "...",
          "supports_claim": true,
          "confidence": 0.87,
          "credibilityScore": 0.9
        }
      ],
      "verdict": "Supported",
      "verdictConfidence": 0.92
    }
  ],
  "overall_score": {
    "score": 78,
    "confidence": 0.85,
    "breakdown": {
      "evidenceQuality": 80,
      "sourceCredibility": 85,
      "claimCheckability": 70
    }
  },
  "overallVerifiability": { /* same as overall_score */ }
}
```
