import OpenAI from 'openai';
import { EvidenceItem, AttributionType } from './types';
import { calculate_attribution_boost } from './attribution';
import { stripHtml } from './sanitize';

type RawSource = {
  title: string;
  url: string;
  snippet?: string;
  age?: string;
};

const GENERIC_ENTITY_STOPLIST = new Set([
  // Very common acronyms/terms that cause false relevance matches
  'us',
  'u s',
  'u.s',
  'u.s.',
  'usa',
  'u s a',
  'uk',
  'eu',
  'un',
  'nato',
  // Overly generic news words
  'news',
  'report',
  'reports',
  'update',
]);

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'about',
  'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'will', 'would', 'could', 'should', 'may', 'might',
  'it', 'its', 'this', 'that', 'these', 'those',
  'he', 'she', 'they', 'them', 'we', 'you', 'i',
  'not', 'no', 'yes',
]);

const ENTITY_FALLBACK_EXCLUDE = new Set([
  // Common action/context terms that should not become "entities"
  'announce', 'announced', 'announcement',
  'say', 'says', 'said',
  'state', 'states', 'stated',
  'confirm', 'confirms', 'confirmed',
  'deny', 'denies', 'denied',
  'claim', 'claims', 'claimed',
  'continue', 'continues', 'continued',
  'host', 'hosts', 'hosted',
  'launch', 'launched',
  'start', 'starts', 'started',
  'end', 'ends', 'ended',
  'cancel', 'canceled', 'cancelled',
  'postpone', 'postponed',
  'implement', 'implemented',
  'create', 'created',
  'ban', 'banned',
  'require', 'required',
  'pass', 'passed',
  'sign', 'signed',
  'approve', 'approved',
  'rise', 'rises', 'rose', 'rising',
  'increase', 'increases', 'increased',
  'decrease', 'decreases', 'decreased',
  'fall', 'falls', 'fell', 'falling',
  'debate', 'debates',
  'event', 'events',
  'rally', 'rallies',
  'speech', 'speeches',
  'interview', 'interviews',
  'vote', 'votes', 'voted',
  'campus', 'campuses',
  'nationwide',
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForMatch(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeForMatch(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function containsToken(normalizedHaystack: string, normalizedNeedle: string): boolean {
  if (!normalizedNeedle) return false;
  if (normalizedNeedle.includes(' ')) {
    return normalizedHaystack.includes(normalizedNeedle);
  }
  return new RegExp(`\\b${escapeRegExp(normalizedNeedle)}\\b`, 'i').test(normalizedHaystack);
}

function pruneGenericEntities(entities: string[]): string[] {
  const normalized = entities
    .map((e) => normalizeForMatch(e))
    .filter(Boolean)
    .filter((e) => {
      if (GENERIC_ENTITY_STOPLIST.has(e)) return false;
      // Keep numbers like 8.5 or 2024, but drop extremely short tokens like "us".
      const isNumeric = /^\d+(?:\.\d+)?%?$/.test(e);
      if (!isNumeric && e.length < 3) return false;
      return true;
    });

  // Prefer longer, more specific entities; drop entities that are substrings of longer ones.
  const byLengthDesc = [...dedupePreserveOrder(normalized)].sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  for (const ent of byLengthDesc) {
    if (kept.some((k) => k.includes(ent))) continue;
    kept.push(ent);
  }
  // Return in original-ish order (longest-first is fine for matching, but preserve determinism).
  return kept;
}

const LOW_CREDIBILITY_INDICATORS = [
  'blog', 'wordpress', 'medium.com', 'substack', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com'
];

/**
 * Extract entities (names, organizations, specific terms) from claim
 */
function extractEntities(claim: string): string[] {
  const entities: string[] = [];

  // Quoted phrases (often the most precise)
  const quotedMatches = claim.match(/"([^"]+)"/g);
  if (quotedMatches) {
    quotedMatches.forEach((q) => entities.push(q.replace(/"/g, '')));
  }

  // Capitalized terms/phrases (names, orgs, places) INCLUDING single-word entities (e.g., "Reuters")
  const capped = claim.match(/\b(?:[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?:[A-Z][a-z]+|[A-Z]{2,}))*\b/g);
  if (capped) {
    capped.forEach((c) => entities.push(c));
  }

  // Numbers and dates
  const numbers = claim.match(/\b\d+(?:\.\d+)?%?\b/g);
  if (numbers) {
    numbers.forEach((n) => entities.push(n));
  }

  // Fallback: take a few meaningful tokens so generic/lowercased claims still have "entities".
  // This keeps the hard gate usable even when the claim has no obvious proper nouns.
  const fallbackTokens = tokenize(claim)
    .filter((t) => !STOPWORDS.has(t))
    .filter((t) => !/^\d+(?:\.\d+)?%?$/.test(t))
    .filter((t) => !ENTITY_FALLBACK_EXCLUDE.has(t))
    .filter((t) => t.length >= 4)
    .slice(0, 6);
  entities.push(...fallbackTokens);

  return pruneGenericEntities(entities);
}

/**
 * Extract action keywords from claim
 */
function extractActionKeywords(claim: string): string[] {
  const actionWords = [
    // Speech / announcement
    'announce', 'announced', 'announcement',
    'say', 'says', 'said',
    'state', 'states', 'stated',
    'confirm', 'confirms', 'confirmed',
    'deny', 'denies', 'denied',
    'claim', 'claims', 'claimed',
    // Plans / scheduling / actions
    'continue', 'continues', 'continued',
    'host', 'hosts', 'hosted',
    'launch', 'launched',
    'start', 'starts', 'started',
    'end', 'ends', 'ended',
    'cancel', 'canceled', 'cancelled',
    'postpone', 'postponed',
    'implement', 'implemented',
    'create', 'created',
    // Policy / legal
    'ban', 'banned',
    'require', 'required',
    'pass', 'passed',
    'sign', 'signed',
    'approve', 'approved',
    // Metrics / changes
    'rise', 'rises', 'rose', 'rising',
    'increase', 'increases', 'increased',
    'decrease', 'decreases', 'decreased',
    'fall', 'falls', 'fell', 'falling',
    // Common event nouns
    'debate', 'debates',
    'event', 'events',
    'rally', 'rallies',
    'speech', 'speeches',
    'interview', 'interviews',
    'vote', 'votes', 'voted',
    // Context nouns that are often action-defining
    'campus', 'campuses',
    'nationwide',
  ];

  const claimNorm = normalizeForMatch(claim);
  const found = actionWords
    .map((w) => normalizeForMatch(w))
    .filter(Boolean)
    .filter((w) => containsToken(claimNorm, w));

  if (found.length > 0) return dedupePreserveOrder(found);

  // Fallback: choose a couple of non-stopword tokens (excluding obvious entities)
  const entityTokens = new Set(extractEntities(claim));
  const fallback = tokenize(claim)
    .filter((t) => !STOPWORDS.has(t))
    .filter((t) => !/^\d+(?:\.\d+)?%?$/.test(t))
    .filter((t) => !entityTokens.has(t))
    .filter((t) => t.length >= 4)
    .slice(0, 2);
  return dedupePreserveOrder(fallback);
}

/**
 * Relevance gate: check if evidence actually relates to the claim
 * Returns relevance score 0-1, where < 0.4 should be rejected
 */
export function calculateRelevanceScore(claim: string, evidenceTitle: string, evidenceSnippet: string): number {
  const entities = extractEntities(claim);
  const actionKeywords = extractActionKeywords(claim);
  const evidenceText = normalizeForMatch(`${evidenceTitle} ${evidenceSnippet}`);
  
  // Count entity matches
  const matchingEntities = entities.filter((entity) => containsToken(evidenceText, entity));
  const entityMatchRatio = entities.length > 0 ? matchingEntities.length / entities.length : 0;
  
  // Count action keyword matches
  const matchingKeywords = actionKeywords.filter((kw) => containsToken(evidenceText, kw));
  const keywordMatchRatio = actionKeywords.length > 0 ? matchingKeywords.length / actionKeywords.length : 0;
  
  // HARD GATE: Evidence must mention at least one core entity AND at least one action keyword.
  // This prevents broad context pieces (e.g., generic "USA" mentions) from being accepted as corroboration.
  if (matchingEntities.length === 0 || matchingKeywords.length === 0) {
    return 0;
  }
  
  // Calculate combined relevance score
  // Weight entities more heavily (70/30) since they're more specific
  const relevanceScore = (entityMatchRatio * 0.7) + (keywordMatchRatio * 0.3);
  
  // Boost score if we have strong matches
  if (matchingEntities.length >= 2 && matchingKeywords.length >= 1) {
    return Math.min(relevanceScore * 1.2, 1.0);
  }
  
  return relevanceScore;
}

export function assessSourceCredibility(domain: string): number {
  const d = domain.toLowerCase();

  // Government/official/academic
  if (d.endsWith('.gov') || d.endsWith('.mil') || d.endsWith('.edu')) return 0.95;
  if (d.endsWith('who.int') || d.endsWith('cdc.gov') || d.endsWith('nih.gov')) return 0.95;

  // Wire services
  if (d.endsWith('reuters.com') || d.endsWith('apnews.com') || d.endsWith('afp.com')) return 0.90;

  // Tier-1 news
  if (d.endsWith('nytimes.com') || d.endsWith('wsj.com') || d.endsWith('ft.com') || d.endsWith('bbc.com') || d.endsWith('bbc.co.uk')) return 0.85;

  // Tier-2 news
  if (d.endsWith('cnn.com') || d.endsWith('theguardian.com') || d.endsWith('politico.com')) return 0.80;
  
  // Low credibility: 0.2-0.4
  if (LOW_CREDIBILITY_INDICATORS.some(lc => d.includes(lc))) {
    return 0.3;
  }
  
  // Unknown: default medium-low
  return 0.55;
}

export function extractKeyQuote(snippet: string, claim: string): string | undefined {
  if (!snippet || snippet.length < 20) return undefined;
  
  // Simple heuristic: return first complete sentence that's not too short
  const sentences = snippet.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  return sentences[0] || snippet.slice(0, 150);
}

export async function scoreEvidence(
  claim: string,
  sources: RawSource[],
  attributionType?: AttributionType
): Promise<EvidenceItem[]> {
  // Calculate attribution boost if present
  const attributionBoost = attributionType ? calculate_attribution_boost(attributionType) : 0;
  
  const scoredItems: EvidenceItem[] = [];
  
  for (const source of sources) {
    const domain = new URL(source.url).hostname.replace(/^www\./, '');
    const cleanSnippet = stripHtml(source.snippet || '');
    
    // NEW: Apply relevance gate
    const relevanceScore = calculateRelevanceScore(claim, source.title, cleanSnippet);
    
    // REJECT if relevance is too low (< 0.4)
    if (relevanceScore < 0.4) {
      console.log(`[relevance_gate:rejected] ${source.title.substring(0, 60)}... - score: ${relevanceScore.toFixed(2)}`);
      continue; // Skip this source
    }
    
    const baselineReputation = assessSourceCredibility(domain);

    // Match quality now uses the stricter relevance score
    const matchQuality = relevanceScore;

    // Total credibility = baseline reputation + match quality (weighted)
    const credibility = Math.max(0.05, Math.min(1, baselineReputation * 0.75 + matchQuality * 0.25));

    // Convert relevance + baseline to confidence (0-1) and add attribution boost
    const baseConfidence = matchQuality * 0.7 + baselineReputation * 0.3;
    const confidence = Math.min(Math.max(baseConfidence + attributionBoost, 0.2), 1.0);
    
    scoredItems.push({
      role: 'CORROBORATION',
      url: source.url,
      title: source.title,
      domain,
      publisher: domain,
      published_at: source.age ? parsePublishDate(source.age) : undefined,
      snippet: cleanSnippet,
      stance: 'unclear',
      credibility,
      supports_claim: false, // legacy: will be updated by analyzeSourceStance
      confidence, // legacy
      // Legacy fields for backward compatibility
      age: source.age,
      relevanceScore: Math.max(relevanceScore, 0.3),
      credibilityScore: baselineReputation,
      stanceTowardsClaim: 'unclear',
      keyQuote: extractKeyQuote(cleanSnippet, claim),
    });
  }
  
  return scoredItems;
}

function parsePublishDate(ageString: string): string | undefined {
  if (!ageString) return undefined;
  
  const match = ageString.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return undefined;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const now = new Date();
  
  switch (unit) {
    case 'second':
      now.setSeconds(now.getSeconds() - value);
      break;
    case 'minute':
      now.setMinutes(now.getMinutes() - value);
      break;
    case 'hour':
      now.setHours(now.getHours() - value);
      break;
    case 'day':
      now.setDate(now.getDate() - value);
      break;
    case 'week':
      now.setDate(now.getDate() - (value * 7));
      break;
    case 'month':
      now.setMonth(now.getMonth() - value);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - value);
      break;
  }
  
  return now.toISOString().split('T')[0];
}

export async function analyzeSourceStance(
  claim: string,
  evidence: EvidenceItem[],
  openai: OpenAI,
  claimType?: string
): Promise<EvidenceItem[]> {
  if (evidence.length === 0) return evidence;
  
  try {
    const prompt = {
      claim,
      sources: evidence.map((e, idx) => ({
        index: idx,
        title: e.title,
        snippet: e.snippet,
      })),
    };
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: [
            'For each source, determine if it SUPPORTS, REFUTES, is CONTEXT (relevant but not confirming), is NEUTRAL, or is UNCLEAR about the claim.',
            'Be strict: only mark SUPPORTS/REFUTES when the snippet explicitly confirms/denies the specific relationship in the claim.',
            'Return JSON only: { stances: Array<{ index: number, stance: "supports"|"refutes"|"context"|"neutral"|"unclear" }> }',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const stances: Array<{ index: number; stance: string }> = result.stances || [];
    
    const claimIsQuote = claimType === 'QUOTE' || /(?:"[^"\n]{5,}"|“[^”\n]{5,}”)/.test(claim);

    const passesStrictSupportGate = (ev: EvidenceItem): boolean => {
      const evidenceText = normalizeForMatch(`${ev.title} ${ev.snippet}`);
      const entities = extractEntities(claim);
      const matchingEntities = entities.filter((ent) => containsToken(evidenceText, ent));

      // Must share at least one non-generic entity.
      if (matchingEntities.length === 0) return false;

      if (claimIsQuote) {
        const quotedMatches = claim.match(/"([^"]+)"/g) || claim.match(/“([^”]+)”/g);
        const quotedPhrases = (quotedMatches || [])
          .map((q) => q.replace(/["“”]/g, ''))
          .map((q) => normalizeForMatch(q))
          .filter(Boolean);

        // For quote claims, require the quoted phrase (or a substantial sub-phrase) to appear.
        if (quotedPhrases.length === 0) return false;
        return quotedPhrases.some((phrase) => {
          if (phrase.length < 8) return false;
          return evidenceText.includes(phrase);
        });
      }

      // For non-quote claims, require concept/action match (entity + action gate).
      return calculateRelevanceScore(claim, ev.title, ev.snippet) > 0;
    };

    // Update evidence with stances
    return evidence.map((e, idx) => {
      const stanceData = stances.find(s => s.index === idx);
      if (stanceData && ['supports', 'refutes', 'neutral', 'context', 'unclear'].includes(stanceData.stance)) {
        const stanceTowardsClaim = stanceData.stance as EvidenceItem['stanceTowardsClaim'];

        const stance: EvidenceItem['stance'] =
          stanceTowardsClaim === 'supports'
            ? 'support'
            : stanceTowardsClaim === 'refutes'
              ? 'refute'
              : stanceTowardsClaim === 'context'
                ? 'context'
              : 'unclear';

        let finalStance: EvidenceItem['stance'] = stance;
        let finalStanceTowards: EvidenceItem['stanceTowardsClaim'] = stanceTowardsClaim;

        // HARD QUALITY RULE:
        // Don’t allow broad context to become “support/refute”. If it fails strict matching, downgrade to context.
        if ((stance === 'support' || stance === 'refute') && !passesStrictSupportGate(e)) {
          finalStance = 'context';
          finalStanceTowards = 'context';
        }

        return {
          ...e,
          stance: finalStance,
          stanceTowardsClaim: finalStanceTowards,
          supports_claim: finalStance === 'support',
        };
      }
      return e;
    });
  } catch (error) {
    console.error('Error analyzing source stance:', error);
    return evidence;
  }
}
