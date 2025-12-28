import { AttributionType } from './types';

export type AttributionResult = {
  is_attributed: boolean;
  attribution_snippet: string;
  attribution_type: AttributionType;
};

/**
 * Detect if a claim is attributed to a source within the article text
 * 
 * @param claim_text - The claim text to check
 * @param article_text - The full article text to search for attribution
 * @returns Attribution detection result
 */
export function detect_attribution(claim_text: string, article_text: string): AttributionResult {
  // Normalize texts for comparison
  const normalizedClaim = normalize_text(claim_text);
  const normalizedArticle = normalize_text(article_text);

  // 1. Check for direct quotes (claim surrounded by quotation marks)
  const directQuote = detect_direct_quote(normalizedClaim, normalizedArticle);
  if (directQuote) {
    return directQuote;
  }

  // 2. Check for official statements BEFORE reported speech (more specific)
  const officialStatement = detect_official_statement(normalizedClaim, normalizedArticle);
  if (officialStatement) {
    return officialStatement;
  }

  // 3. Check for reported speech patterns ("X said", "according to X")
  const reportedSpeech = detect_reported_speech(normalizedClaim, normalizedArticle);
  if (reportedSpeech) {
    return reportedSpeech;
  }

  // No attribution found
  return {
    is_attributed: false,
    attribution_snippet: '',
    attribution_type: 'UNATTRIBUTED',
  };
}

/**
 * Normalize text for comparison (lowercase, collapse whitespace)
 */
function normalize_text(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Extract a snippet around a match position
 */
function extract_snippet(text: string, matchIndex: number, matchLength: number, contextChars: number = 80): string {
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + matchLength + contextChars);
  
  let snippet = text.slice(start, end).trim();
  
  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Find the claim text within the article (approximate matching)
 */
function find_claim_in_article(claim: string, article: string): { index: number; length: number } | null {
  // Try exact match first
  let index = article.indexOf(claim);
  if (index !== -1) {
    return { index, length: claim.length };
  }

  // Try finding significant portion (at least 60% of words)
  const claimWords = claim.split(' ').filter(w => w.length > 2);
  if (claimWords.length < 3) return null;

  const minWords = Math.ceil(claimWords.length * 0.6);
  
  // Try progressive subsets
  for (let len = claimWords.length; len >= minWords; len--) {
    for (let start = 0; start <= claimWords.length - len; start++) {
      const subset = claimWords.slice(start, start + len).join(' ');
      index = article.indexOf(subset);
      if (index !== -1) {
        return { index, length: subset.length };
      }
    }
  }

  return null;
}

/**
 * Detect direct quotes with nearby attribution
 * Looks for: "claim text" with attribution before or after
 */
function detect_direct_quote(claim: string, article: string): AttributionResult | null {
  const match = find_claim_in_article(claim, article);
  if (!match) return null;

  const { index, length } = match;
  
  // Check for quotation marks around the claim
  const beforeQuote = article.slice(Math.max(0, index - 50), index);
  const afterQuote = article.slice(index + length, Math.min(article.length, index + length + 50));
  
  // Check if claim is within quotes
  const hasOpeningQuote = beforeQuote.includes('"') || beforeQuote.includes('"') || beforeQuote.includes('"');
  const hasClosingQuote = afterQuote.includes('"') || afterQuote.includes('"') || afterQuote.includes('"');
  
  if (hasOpeningQuote && hasClosingQuote) {
    // Look for attribution patterns near the quote
    const context = article.slice(Math.max(0, index - 150), Math.min(article.length, index + length + 150));
    
    const attributionPatterns = [
      /(?:said|told|wrote|stated|claimed|announced|declared|noted|explained|testified|argued|contended)\b/i,
      /\baccording to\b/i,
    ];
    
    for (const pattern of attributionPatterns) {
      if (pattern.test(context)) {
        const snippet = extract_snippet(article, index, length, 100);
        return {
          is_attributed: true,
          attribution_snippet: snippet,
          attribution_type: 'DIRECT_QUOTE',
        };
      }
    }
  }

  return null;
}

/**
 * Detect reported speech patterns
 * Looks for: "X said [claim]", "according to X, [claim]"
 * Excludes official titles (those are handled by detect_official_statement)
 */
function detect_reported_speech(claim: string, article: string): AttributionResult | null {
  const match = find_claim_in_article(claim, article);
  if (!match) return null;

  const { index, length } = match;
  
  // Look for attribution patterns in the 100 chars before the claim
  const before = article.slice(Math.max(0, index - 100), index);
  
  // Exclude official titles - those should be caught by official statement detector
  const officialTitles = /\b(?:official|authority|spokesperson|spokesman|spokeswoman|minister|secretary|director|commissioner|president|governor|mayor|senator|congressman|congresswoman|the white house|pentagon|department|ministry|government)\b/i;
  
  // Common reported speech patterns for individuals
  const patterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:said|told|wrote|stated|claimed|announced|declared|noted|explained|testified|argued|contended)\b/i,
    /\baccording to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:has said|have said|had said|says|told reporters|told the press)\b/i,
    /\bas\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:said|stated|noted)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(before);
    if (match) {
      // Check if this contains an official title - if so, skip it
      if (officialTitles.test(before)) {
        continue;
      }
      
      const snippet = extract_snippet(article, index, length, 100);
      return {
        is_attributed: true,
        attribution_snippet: snippet,
        attribution_type: 'REPORTED_SPEECH',
      };
    }
  }

  return null;
}

/**
 * Detect official statements
 * Looks for: "officials said", "the ministry said", "the White House said"
 */
function detect_official_statement(claim: string, article: string): AttributionResult | null {
  const match = find_claim_in_article(claim, article);
  if (!match) return null;

  const { index, length } = match;
  
  // Look for official source patterns in the 100 chars before the claim
  const before = article.slice(Math.max(0, index - 100), index);
  
  // Official statement patterns (more specific than reported speech)
  const patterns = [
    /\b(?:local\s+)?(?:officials?|authorities|spokesperson|spokesman|spokeswoman|representative)\s+(?:said|stated|announced|declared|confirmed|reported|told|claimed)\b/i,
    /\bthe\s+(?:white house|pentagon|state department|justice department|defense department|labor department|government|administration)\s+(?:said|stated|announced|declared|confirmed|reported)\b/i,
    /\b(?:department|ministry)\s+of\s+[a-z]+\s+(?:said|stated|announced|declared|confirmed|reported)\b/i,
    /\bthe\s+[a-z]+\s+(?:department|ministry)\b/i,  // "the Labor Department", "the Health Ministry"
    /\b(?:in a statement|in an announcement|in a press release|in a news conference|in a briefing|at a press conference)\b/i,
    /\baccording to\s+(?:local\s+)?(?:officials?|authorities|a statement|an announcement|the\s+(?:white house|pentagon|government|department|ministry|[a-z]+\s+department))\b/i,
    /\b(?:minister|secretary|director|commissioner|chief|president|governor|mayor|senator|congressman|congresswoman)\s+(?:said|stated|announced|declared|confirmed|reported|told)\b/i,
    /\b(?:bank of|central bank|federal reserve)\s+[a-z]+\s+(?:said|announced|stated|reported)\b/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(before)) {
      const snippet = extract_snippet(article, index, length, 100);
      return {
        is_attributed: true,
        attribution_snippet: snippet,
        attribution_type: 'OFFICIAL_STATEMENT',
      };
    }
  }

  return null;
}

/**
 * Calculate attribution credibility boost for evidence scoring
 * Returns a score between 0 and 0.2 to add to base credibility
 */
export function calculate_attribution_boost(attribution_type: AttributionType): number {
  switch (attribution_type) {
    case 'DIRECT_QUOTE':
      return 0.15; // Highest boost for direct quotes
    case 'OFFICIAL_STATEMENT':
      return 0.12; // High boost for official statements
    case 'REPORTED_SPEECH':
      return 0.10; // Moderate boost for reported speech
    case 'UNATTRIBUTED':
      return 0.0;  // No boost
    default:
      return 0.0;
  }
}
