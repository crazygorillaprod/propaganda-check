# Verifiability Scoring System

## Overview

The verifiability scoring system evaluates claims on a 0-100 scale with four weighted components that reflect both the quality of attribution and the strength of external corroboration.

## Score Breakdown (0-100 total)

### 1. Attribution (0-30 points)
Evaluates the quality and type of attribution in the original claim.

**Scoring:**
- **Direct Quote** (30 points): Claim includes verbatim quote with attribution
  - Example: `The president said "we will reduce taxes"`
- **Official Statement** (25 points): Claim attributed to official source
  - Example: `According to NASA officials, the mission succeeded`
- **Reported Speech** (20 points): Claim attributes information to a source
  - Example: `Sources told Reuters that negotiations continue`
- **Unattributed** (10 points): No attribution present
  - Example: `Unemployment rose last quarter`

### 2. First Corroboration (0-30 points)
Rewards finding the first reputable external source that corroborates the claim.

**Scoring:**
- Based on source credibility × 30
- High credibility sources (Reuters, AP, .gov, .edu): ~27-30 points
- Medium credibility sources (NYT, Guardian): ~18-21 points
- Low credibility sources: ~9-12 points

### 3. Additional Corroboration (0-20 points)
Rewards multiple independent sources with diminishing returns.

**Scoring:**
- 2 unique domains: ~7 points (1/3 × 20)
- 3 unique domains: ~13 points (2/3 × 20)
- 4+ unique domains: 20 points (3/3 × 20)

### 4. Specificity (0-20 points)
Evaluates how verifiable and checkable the claim is.

**Scoring:**
- Based on claim checkability × 20
- Specific claims with dates, numbers, names: 16-20 points
- Moderate specificity: 10-15 points
- Vague claims: 4-9 points

## Claim-Type Weighting

Different types of claims are weighted differently based on what matters most for verification:

### QUOTE Claims
- **Attribution weight:** 100% (full weight)
- **Corroboration weight:** 100% (standard)
- **Rationale:** For quoted claims, attribution is critical. We need to know who said it, but external corroboration still matters to verify the quote is accurate.

### EVENT Claims
- **Attribution weight:** 70% (reduced)
- **Corroboration weight:** 115% (boosted, capped at 30)
- **Rationale:** For events, multiple independent sources matter more than attribution. Eyewitness accounts and news reports are key.

### SCHEDULE Claims
- **Attribution weight:** 70% (reduced)
- **Corroboration weight:** 115% (boosted, capped at 30)
- **Specificity penalty:** 50% if checkability < 0.7
- **Rationale:** Scheduled events require specific dates and participants. Vague timing ("soon", "next month") is heavily penalized.

### POLICY and OTHER Claims
- **No special weighting:** Standard scoring applies

## Status Indicators

### VERIFIED
- **Score:** 0-100
- **Message:** None
- **Meaning:** Evidence retrieval succeeded, claims were evaluated

### NOT_RUN
- **Score:** `null` (displayed as "N/A")
- **Message:** "Evidence retrieval not run (missing API key or disabled)."
- **Meaning:** Search was not performed due to missing API key or disabled configuration

### NO_EVIDENCE_RETRIEVED
- **Score:** 0
- **Message:** "No evidence found for claims."
- **Meaning:** Search was performed but no evidence was found for any claims

## Example Calculations

### Example 1: High-Confidence Quote
```
Claim: The president said "we will reduce taxes by 5%"
Type: QUOTE
Attribution: DIRECT_QUOTE
Evidence: 3 sources (Reuters, AP, BBC)
Checkability: 0.85

Calculation:
- Attribution: 30 (DIRECT_QUOTE, QUOTE type = 100% weight)
- First corroboration: 27 (0.9 credibility × 30)
- Additional corroboration: 13 (2 additional sources = 2/3 × 20)
- Specificity: 17 (0.85 × 20)

Total: 87/100
```

### Example 2: Event with Multiple Sources
```
Claim: Fire occurred at downtown building
Type: EVENT
Attribution: UNATTRIBUTED
Evidence: 2 sources (Reuters, local news)
Checkability: 0.7

Calculation:
- Attribution: 7 (10 × 0.7 for EVENT)
- First corroboration: 30 (27 × 1.15, capped at 30 for EVENT boost)
- Additional corroboration: 7 (1 additional source = 1/3 × 20)
- Specificity: 14 (0.7 × 20)

Total: 58/100
```

### Example 3: Vague Schedule Claim
```
Claim: Meeting will happen soon
Type: SCHEDULE
Attribution: REPORTED_SPEECH
Evidence: 1 source (example.com)
Checkability: 0.4 (vague timing)

Calculation:
- Attribution: 14 (20 × 0.7 for SCHEDULE)
- First corroboration: 15 (0.5 credibility × 30)
- Additional corroboration: 0 (no additional sources)
- Specificity: 4 (0.4 × 20 × 0.5 penalty for vague SCHEDULE)

Total: 33/100
```

## Legacy Fields

For backward compatibility, the system also includes legacy breakdown fields:

- `evidenceQuality` (0-100%): Based on corroboration scores
- `sourceCredibility` (0-100%): Average credibility of all sources
- `claimCheckability` (0-100%): Average checkability of all claims

These fields are calculated alongside the new breakdown and can be displayed in a collapsible "Legacy Breakdown" section.

## API Response Format

### VERIFIED Status
```json
{
  "overall_score": {
    "score": 87,
    "confidence": 0.95,
    "status": "VERIFIED",
    "breakdown": {
      "attribution": 30,
      "corroboration_1": 27,
      "corroboration_2plus": 13,
      "specificity": 17,
      "evidenceQuality": 80,
      "sourceCredibility": 90,
      "claimCheckability": 85
    }
  }
}
```

### NOT_RUN Status
```json
{
  "overall_score": {
    "score": null,
    "confidence": 0,
    "status": "NOT_RUN",
    "message": "Evidence retrieval not run (missing API key or disabled).",
    "breakdown": {
      "attribution": 0,
      "corroboration_1": 0,
      "corroboration_2plus": 0,
      "specificity": 0,
      "evidenceQuality": 0,
      "sourceCredibility": 0,
      "claimCheckability": 0
    }
  }
}
```

### NO_EVIDENCE_RETRIEVED Status
```json
{
  "overall_score": {
    "score": 0,
    "confidence": 0,
    "status": "NO_EVIDENCE_RETRIEVED",
    "message": "No evidence found for claims.",
    "breakdown": {
      "attribution": 0,
      "corroboration_1": 0,
      "corroboration_2plus": 0,
      "specificity": 0,
      "evidenceQuality": 0,
      "sourceCredibility": 0,
      "claimCheckability": 0
    }
  }
}
```

## UI Display

### Score Display
- **VERIFIED:** Display score as `87/100` with color coding:
  - Green (>70): High confidence
  - Orange (40-70): Medium confidence
  - Red (<40): Low confidence
- **NOT_RUN:** Display as `N/A/100` with yellow warning banner
- **NO_EVIDENCE_RETRIEVED:** Display as `0/100` with red info banner

### Breakdown Display
Show new breakdown prominently:
- Attribution (0-30)
- First Source (0-30)
- Additional Sources (0-20)
- Specificity (0-20)

Legacy breakdown in collapsible section for backward compatibility.

## Testing

Snapshot tests ensure consistent JSON output format:
- `__tests__/verifiability.test.ts`: Unit tests for scoring logic
- `__tests__/__snapshots__/verifiability.test.ts.snap`: JSON snapshots for each status

Run tests: `npm test verifiability.test.ts`
