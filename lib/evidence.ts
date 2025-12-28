import OpenAI from 'openai';
import { EvidenceItem } from './types';

type RawSource = {
  title: string;
  url: string;
  snippet?: string;
  age?: string;
};

const HIGH_CREDIBILITY_DOMAINS = [
  'gov', 'edu', 'reuters.com', 'apnews.com', 'bbc.com', 'npr.org',
  'nature.com', 'science.org', 'who.int', 'cdc.gov', 'nih.gov'
];

const MEDIUM_CREDIBILITY_DOMAINS = [
  'cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
  'wsj.com', 'bloomberg.com', 'economist.com', 'theatlantic.com'
];

const LOW_CREDIBILITY_INDICATORS = [
  'blog', 'wordpress', 'medium.com', 'substack', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com'
];

export function assessSourceCredibility(domain: string): number {
  const d = domain.toLowerCase();
  
  // High credibility: 0.8-1.0
  if (HIGH_CREDIBILITY_DOMAINS.some(hc => d.endsWith(hc) || d.includes(hc))) {
    return 0.9;
  }
  
  // Medium credibility: 0.5-0.7
  if (MEDIUM_CREDIBILITY_DOMAINS.some(mc => d.includes(mc))) {
    return 0.6;
  }
  
  // Low credibility: 0.2-0.4
  if (LOW_CREDIBILITY_INDICATORS.some(lc => d.includes(lc))) {
    return 0.3;
  }
  
  // Unknown: default medium-low
  return 0.5;
}

export function extractKeyQuote(snippet: string, claim: string): string | undefined {
  if (!snippet || snippet.length < 20) return undefined;
  
  // Simple heuristic: return first complete sentence that's not too short
  const sentences = snippet.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  return sentences[0] || snippet.slice(0, 150);
}

export async function scoreEvidence(
  claim: string,
  sources: RawSource[]
): Promise<EvidenceItem[]> {
  return sources.map(source => {
    const domain = new URL(source.url).hostname.replace(/^www\./, '');
    
    // Simple relevance heuristic: check if claim keywords appear in title/snippet
    const claimKeywords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sourceText = `${source.title} ${source.snippet || ''}`.toLowerCase();
    const matchingKeywords = claimKeywords.filter(kw => sourceText.includes(kw));
    const relevanceScore = Math.min(matchingKeywords.length / Math.max(claimKeywords.length, 1), 1);
    
    return {
      url: source.url,
      title: source.title,
      snippet: source.snippet || '',
      domain,
      age: source.age,
      relevanceScore: Math.max(relevanceScore, 0.3), // minimum baseline
      credibilityScore: assessSourceCredibility(domain),
      stanceTowardsClaim: 'unclear', // will be updated by analyzeSourceStance
      keyQuote: extractKeyQuote(source.snippet || '', claim),
    };
  });
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
          content: 'For each source, determine if it supports, refutes, is neutral toward, or is unclear about the claim. Return JSON: { stances: Array<{ index: number, stance: "supports"|"refutes"|"neutral"|"unclear" }> }',
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
      if (stanceData && ['supports', 'refutes', 'neutral', 'unclear'].includes(stanceData.stance)) {
        return { ...e, stanceTowardsClaim: stanceData.stance as EvidenceItem['stanceTowardsClaim'] };
      }
      return e;
    });
  } catch (error) {
    console.error('Error analyzing source stance:', error);
    return evidence;
  }
}
