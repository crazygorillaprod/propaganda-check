# Evidence Retrieval Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL EVIDENCE RETRIEVAL                         │
└─────────────────────────────────────────────────────────────────────────────┘

USER INPUT
    │
    ├─── URL? ───────────────────────────────────────────────────────┐
    │                                                                 │
    ▼                                                                 ▼
[Extract Claims]                                            [Fetch HTML & Metadata]
    │                                                                 │
    │ claims[]: Claim[]                                               │ article_meta
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ╔═══════════════════════╗
                    ║ FOR EACH CLAIM        ║
                    ╚═══════════════════════╝
                              │
                              ▼
                    ┌─────────────────────┐
                    │ build_queries()     │──────┐
                    │ - Direct claim      │      │ queries[]
                    │ - Number search     │      │
                    │ - Entity search     │      │
                    └─────────────────────┘      │
                              │                  │
                              ▼                  │
                    ┌─────────────────────┐      │
                    │ getSearchClient()   │◄─────┘
                    │                     │
                    │ Has API Key?        │
                    └──────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
          YES   │                     │  NO
                ▼                     ▼
    ┌───────────────────────┐   ┌──────────────────┐
    │ BraveSearchClient     │   │ StubSearchClient │
    │ - Call API            │   │ - Return []      │
    │ - Parse results       │   │ - Log message    │
    │ - Return SearchResult │   │ - backend: stub  │
    └───────────────────────┘   └──────────────────┘
                │                     │
                └──────────┬──────────┘
                           │ SearchResult[]
                           ▼
                ┌─────────────────────┐
                │ retrieve_evidence() │
                │ - Multi-query search│
                │ - Deduplicate URLs  │
                │ - Filter bad links  │
                │ - Filter reputable  │
                │ - Dedupe by domain  │
                │ - Top 6 results     │
                └─────────────────────┘
                           │ SearchResult[]
                           ▼
                ┌─────────────────────┐
                │ scoreEvidence()     │
                │ - Assess credibility│
                │ - Calculate relevance│
                │ - Attribution boost │
                │ - Confidence: 0-1   │
                └─────────────────────┘
                           │ EvidenceItem[]
                           ▼
                ┌─────────────────────┐
                │ analyzeSourceStance │
                │ - GPT-4o analysis   │
                │ - supports/refutes  │
                │ - Update items      │
                └─────────────────────┘
                           │ EvidenceItem[]
                           ▼
                ┌─────────────────────┐
                │ Calculate Summary   │
                │ - totalSources      │
                │ - uniqueDomains     │
                │ - supportingCount   │
                │ - refutingCount     │
                │ - avgCredibility    │
                └─────────────────────┘
                           │
                    ╔═══════════════════════╗
                    ║ END FOR EACH CLAIM    ║
                    ╚═══════════════════════╝
                           │
                           ▼
          ┌────────────────────────────────────────┐
          │ calculateOverallVerifiability()        │
          │                                        │
          │ searchEnabled?                         │
          │    NO  → status: NOT_RUN               │
          │           score: null                  │
          │                                        │
          │    YES → totalEvidence === 0?          │
          │          YES → status: NO_EVIDENCE_FOUND│
          │                score: 0                │
          │                                        │
          │          NO  → status: EVIDENCE_FOUND  │
          │                score: 0-100            │
          │                breakdown: {            │
          │                  attribution: 0-30     │
          │                  corroboration_1: 0-30 │
          │                  corroboration_2+: 0-20│
          │                  specificity: 0-20     │
          │                }                       │
          └────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ UI Display  │
                    │             │
                    │ NOT_RUN:    │
                    │  N/A/100 🟨 │
                    │             │
                    │ NO_EVIDENCE:│
                    │  0/100 🟥   │
                    │             │
                    │ FOUND:      │
                    │  X/100      │
                    │  + Evidence │
                    └─────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            KEY COMPONENTS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

SearchResult:
  ├─ title: string
  ├─ url: string
  ├─ snippet: string
  └─ age?: string

EvidenceItem:
  ├─ url: string
  ├─ title: string
  ├─ publisher: string
  ├─ published_at?: string
  ├─ snippet: string
  ├─ supports_claim: boolean
  └─ confidence: number (0-1)

EvidenceSummary:
  ├─ totalSources: number
  ├─ uniqueDomains: number
  ├─ supportingCount: number
  ├─ refutingCount: number
  └─ averageCredibility: number

VerifiabilityStatus:
  ├─ 'NOT_RUN' ────────→ API key missing, search disabled
  ├─ 'NO_EVIDENCE_FOUND' → Search ran, no results
  └─ 'EVIDENCE_FOUND' ──→ Evidence retrieved and scored


┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUALITY FILTERS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Reputable Sources (60+ domains):
  News Agencies:  Reuters, AP, AFP, BBC
  Newspapers:     NYT, WaPo, Guardian, WSJ
  Government:     .gov, .edu, who.int, cdc.gov
  Academic:       nature.com, science.org
  Fact-checking:  snopes.com, factcheck.org

Bad Citations (filtered out):
  ├─ Homepages (/)
  ├─ Terms/Privacy pages
  ├─ About/Contact pages
  ├─ Hub pages (AP)
  └─ Shallow category pages

Confidence Calculation:
  baseConfidence = (relevance × 0.7) + (credibility × 0.3)
  + attribution boost (0.2 - 0.3)
  = final confidence (0.2 - 1.0)


┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING COVERAGE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

112 tests passing ✓
  ├─ evidence-retrieval.test.ts (11 tests)
  │   ├─ Complete flow integration
  │   ├─ Evidence summary calculations
  │   ├─ Status handling (NOT_RUN, NO_EVIDENCE_FOUND, EVIDENCE_FOUND)
  │   └─ EvidenceItem structure validation
  │
  ├─ search-client.test.ts (49 tests)
  │   ├─ Query building
  │   ├─ Reputable source filtering
  │   ├─ Bad citation detection
  │   └─ Evidence retrieval
  │
  ├─ verifiability.test.ts (8 tests)
  │   ├─ Score breakdown
  │   ├─ Claim-type weighting
  │   └─ Status handling
  │
  └─ Other tests (44 tests)
      ├─ Attribution detection
      ├─ HTML parsing
      └─ Type models
```
