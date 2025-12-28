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
  
  return sources.map(source => {
    const domain = new URL(source.url).hostname.replace(/^www\./, '');
    const cleanSnippet = stripHtml(source.snippet || '');
    
    // Simple relevance heuristic: check if claim keywords appear in title/snippet
    const claimKeywords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sourceText = `${source.title} ${cleanSnippet}`.toLowerCase();
    const matchingKeywords = claimKeywords.filter(kw => sourceText.includes(kw));
    const relevanceScore = Math.min(matchingKeywords.length / Math.max(claimKeywords.length, 1), 1);
    
    const baselineReputation = assessSourceCredibility(domain);

    // Match quality: how directly the source text overlaps the claim keywords.
    const matchQuality = Math.max(0, Math.min(1, relevanceScore));

    // Total credibility = baseline reputation + match quality (weighted)
    const credibility = Math.max(0.05, Math.min(1, baselineReputation * 0.75 + matchQuality * 0.25));

    // Convert relevance + baseline to confidence (0-1) and add attribution boost
    const baseConfidence = matchQuality * 0.7 + baselineReputation * 0.3;
    const confidence = Math.min(Math.max(baseConfidence + attributionBoost, 0.2), 1.0);
    
    return {
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
    };
  });
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
