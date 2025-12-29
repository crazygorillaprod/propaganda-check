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

const LOW_CREDIBILITY_INDICATORS = [
  'blog', 'wordpress', 'medium.com', 'substack', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com'
];

/**
 * Extract entities (names, organizations, specific terms) from claim
 */
function extractEntities(claim: string): string[] {
  const entities: string[] = [];
  
  // Quoted phrases (exact matches)
  const quotedMatches = claim.match(/"([^"]+)"/g);
  if (quotedMatches) {
    quotedMatches.forEach(q => entities.push(q.replace(/"/g, '').toLowerCase()));
  }
  
  // Capitalized phrases (likely names/orgs)
  const capitalizedMatches = claim.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
  if (capitalizedMatches) {
    capitalizedMatches.forEach(cap => entities.push(cap.toLowerCase()));
  }
  
  // Acronyms (2+ caps)
  const acronyms = claim.match(/\b[A-Z]{2,}\b/g);
  if (acronyms) {
    acronyms.forEach(acr => entities.push(acr.toLowerCase()));
  }
  
  return entities;
}

/**
 * Extract action keywords from claim
 */
function extractActionKeywords(claim: string): string[] {
  const actionVerbs = [
    'continue', 'host', 'announce', 'said', 'stated', 'confirmed', 
    'denied', 'plan', 'plans', 'will', 'launched', 'started', 
    'ended', 'canceled', 'postponed', 'implemented', 'created',
    'debate', 'debates', 'event', 'nationwide', 'campus'
  ];
  
  const claimLower = claim.toLowerCase();
  return actionVerbs.filter(verb => claimLower.includes(verb));
}

/**
 * Relevance gate: check if evidence actually relates to the claim
 * Returns relevance score 0-1, where < 0.4 should be rejected
 */
export function calculateRelevanceScore(claim: string, evidenceTitle: string, evidenceSnippet: string): number {
  const entities = extractEntities(claim);
  const actionKeywords = extractActionKeywords(claim);
  const evidenceText = `${evidenceTitle} ${evidenceSnippet}`.toLowerCase();
  
  // Count entity matches
  const matchingEntities = entities.filter(entity => evidenceText.includes(entity));
  const entityMatchRatio = entities.length > 0 ? matchingEntities.length / entities.length : 0;
  
  // Count action keyword matches
  const matchingKeywords = actionKeywords.filter(kw => evidenceText.includes(kw));
  const keywordMatchRatio = actionKeywords.length > 0 ? matchingKeywords.length / actionKeywords.length : 0;
  
  // GATE RULE: Must have at least 1 entity match AND 1 keyword match (if both exist)
  if (entities.length > 0 && matchingEntities.length === 0) {
    return 0.1; // No entity match = irrelevant
  }
  
  if (actionKeywords.length > 0 && matchingKeywords.length === 0) {
    return 0.2; // No action keyword match = likely irrelevant
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
  openai: OpenAI
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

        return {
          ...e,
          stance,
          stanceTowardsClaim,
          supports_claim: stance === 'support',
        };
      }
      return e;
    });
  } catch (error) {
    console.error('Error analyzing source stance:', error);
    return evidence;
  }
}
