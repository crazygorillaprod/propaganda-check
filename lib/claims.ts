import OpenAI from 'openai';
import { Claim, ClaimType } from './types';

type RawClaimExtraction = {
  text: string;
  type: ClaimType;
  importance: number;
};

function clamp01(n: number): number {
  return Math.max(0.1, Math.min(1.0, n));
}

function clampCheckability(n: number): number {
  // Spec: cap at 95, floor at 20
  return Math.max(0.2, Math.min(0.95, n));
}

function baselineCheckabilityForType(type: ClaimType): number {
  // User-specified baselines
  if (type === 'EVENT') return 0.7;
  if (type === 'QUOTE') return 0.6;
  if (type === 'SCHEDULE') return 0.55;
  if (type === 'FRAMING') return 0.25;

  // Conservative defaults for other claim types
  if (type === 'POLICY') return 0.65;
  return 0.55;
}

function detectNamedActors(original: string): { hasNamedActor: boolean; count: number } {
  // Heuristic: count capitalized token sequences (names/orgs), excluding common sentence starters.
  const stop = new Set([
    'The','A','An','This','That','It','In','On','At','After','Before','During','For','With','Without','By','From','To','As','And','Or','But',
    // Common pronouns/indefinite subjects that shouldn't count as named actors
    'I','You','We','He','She','They','Someone','Somebody','Something','Anyone','Anybody','Anything','Everyone','Everybody','Everything','Noone','Nobody','Nothing',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August','September','October','November','December',
  ]);

  const matches = original.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  const filtered = matches
    .map((m) => m.trim())
    .filter((m) => m.length >= 3)
    .filter((m) => !stop.has(m));

  // Avoid over-counting: cap at 3 since we only need presence/rough richness
  const count = Math.min(filtered.length, 3);
  return { hasNamedActor: count > 0, count };
}

type TimeReferenceStrength = 'none' | 'weak' | 'strong';

function hasVeryWeakTimeWords(textLower: string): boolean {
  return /\b(recently|soon|sometime)\b/.test(textLower);
}

function getTimeReferenceStrength(textLower: string): TimeReferenceStrength {
  const strongPatterns: RegExp[] = [
    /\b\d{4}\b/, // year
    /\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/, // 12/28/2025
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/, // 3 March
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b/, // March 3, 2024
  ];

  const weakPatterns: RegExp[] = [
    /\b(today|yesterday|tomorrow|tonight)\b/,
    /\bthis\s+(morning|afternoon|evening|week|month|year)\b/,
    /\b(last|next)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
    /\b\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago\b/,
    // Very weak / vague time references are handled separately via hasVeryWeakTimeWords
  ];

  if (strongPatterns.some((p) => p.test(textLower))) return 'strong';
  if (weakPatterns.some((p) => p.test(textLower))) return 'weak';
  return 'none';
}

function hasLocationCue(original: string): boolean {
  // Heuristic: common prepositions or travel/event verbs + Capitalized phrase
  // Examples: "in Paris", "at the White House", "visited Paris", "arrived in Berlin"
  return /\b(in|at|near|outside|inside|visited|visiting|arrived\s+in|traveled\s+to|travelled\s+to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/.test(original);
}

function detectDirectQuote(original: string): boolean {
  // Double quotes or curly quotes with at least a few characters inside
  return /(?:"[^"\n]{5,}"|“[^”\n]{5,}”)/.test(original);
}

function hasSpeakerCue(textLower: string): boolean {
  return /\b(said|says|told|stated|announced|wrote|posted|according\s+to)\b/.test(textLower);
}

function detectScheduleParticipants(textLower: string, namedActorCount: number): boolean {
  if (namedActorCount >= 2) return true;
  return /\b(vs\.?|versus|between|with|alongside|meet(?:s|ing)?\s+with)\b/.test(textLower);
}

function detectVenueCue(original: string, textLower: string): boolean {
  const venueKeywords = [
    'stadium','arena','hall','center','centre','conference','summit','meeting','hearing','court','courthouse',
    'capitol','parliament','white house','un','united nations','g7','g20','nato',
  ];
  if (venueKeywords.some((k) => textLower.includes(k))) return true;

  // "at <Proper Noun>" / "in <Proper Noun>" style
  return /\b(at|in)\s+(?:the\s+)?[A-Z][^,.;]{3,60}/.test(original);
}

export type CheckabilityFeatures = {
  baseline: number;
  namedActors: { present: boolean; count: number };
  time: { strength: TimeReferenceStrength; veryWeak: boolean };
  locationCue: boolean;
  quote: { hasQuoteText: boolean; hasSpeakerCue: boolean };
  schedule: { hasParticipantsCue: boolean; hasVenueCue: boolean };
  vaguenessHits: string[];
};

export function analyzeCheckability(claimText: string, claimType: ClaimType = 'OTHER'): {
  score: number;
  features: CheckabilityFeatures;
} {
  const original = claimText || '';
  const textLower = original.toLowerCase();

  let score = baselineCheckabilityForType(claimType);

  // Specificity factors
  const { hasNamedActor, count: namedActorCount } = detectNamedActors(original);
  const timeStrength = getTimeReferenceStrength(textLower);
  const veryWeakTime = hasVeryWeakTimeWords(textLower);

  // +10 if claim has specific named actor(s)
  if (hasNamedActor) score += 0.10;

  const locationCue = claimType === 'EVENT' ? hasLocationCue(original) : false;
  // +10 if has specific location (EVENT)
  if (locationCue) score += 0.10;

  // +10 if has date/time reference (EVENT/SCHEDULE)
  const hasDateTimeRef = (claimType === 'EVENT' || claimType === 'SCHEDULE') && timeStrength !== 'none';
  if (hasDateTimeRef) score += 0.10;

  const hasQuoteText = claimType === 'QUOTE' ? detectDirectQuote(original) : false;
  const speakerCuePresent = claimType === 'QUOTE' ? hasSpeakerCue(textLower) && hasNamedActor : false;
  if (claimType === 'QUOTE') {
    // +10 if quote text is present with a named speaker (QUOTE)
    if (hasQuoteText && speakerCuePresent) score += 0.10;
  }

  // Keep feature extraction for debugging/introspection; scoring is spec-driven.
  const scheduleParticipants = claimType === 'SCHEDULE'
    ? detectScheduleParticipants(textLower, namedActorCount)
    : false;
  const scheduleVenue = claimType === 'SCHEDULE' ? detectVenueCue(original, textLower) : false;
  const vaguenessHits: string[] = [];

  const baseline = baselineCheckabilityForType(claimType);
  const clamped = clampCheckability(score);

  return {
    score: clamped,
    features: {
      baseline,
      namedActors: { present: hasNamedActor, count: namedActorCount },
      time: { strength: timeStrength, veryWeak: veryWeakTime },
      locationCue,
      quote: { hasQuoteText, hasSpeakerCue: speakerCuePresent },
      schedule: { hasParticipantsCue: scheduleParticipants, hasVenueCue: scheduleVenue },
      vaguenessHits,
    },
  };
}

export function assessCheckability(claimText: string, claimType: ClaimType = 'OTHER'): number {
  return analyzeCheckability(claimText, claimType).score;
}

export function rankClaimImportance(claims: Claim[], textLength: number): Claim[] {
  // Claims mentioned earlier in text are often more important
  // This is already captured in importance from extraction, so just return
  return claims.sort((a, b) => b.importance - a.importance);
}

export async function extractStructuredClaims(
  text: string,
  openai: OpenAI
): Promise<Claim[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: [
            'Extract 3-6 checkable claims from the text.',
            'If the text contains non-checkable interpretation/characterization (e.g., motives, virtue/villain framing, "fighting for a legacy", "trying to make you feel"), you may include up to 2 of those as type "FRAMING".',
            'Do NOT extract claims about the publisher/outlet, authorship, URL/canonical URL, or that an article was published by X. Those belong to source metadata, not factual claims.',
            'For each claim, provide:',
            '- text: the claim statement',
            '- type: "QUOTE" (someone said X), "EVENT" (X happened), "SCHEDULE" (X will happen), "POLICY" (rule/law/decision), "FRAMING" (interpretation/characterization), or "OTHER"',
            '- importance: 0-1 (how central to the main argument)',
            '',
            'Return JSON: { claims: Array<{ text: string, type: string, importance: number }> }',
          ].join('\n'),
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const rawClaims: RawClaimExtraction[] = Array.isArray(result.claims)
      ? result.claims.slice(0, 6)
      : [];

    const inferFramingType = (claimText: string): boolean => {
      const t = (claimText || '').toLowerCase();
      // Characterization / motive / emotional framing language (not reliably checkable)
      const patterns: RegExp[] = [
        /\b(fighting\s+for|protecting\s+.*legacy|legacy)\b/,
        /\b(trying\s+to|aims\s+to|wants\s+to|hopes\s+to|seeks\s+to)\b/,
        /\b(attack\s+on|war\s+on|hate\s+filled|evil|hero|villain)\b/,
        /\b(should|must)\s+.*\b(believe|feel|think)\b/,
        /\b(spin|propaganda|narrative)\b/,
      ];

      // Avoid mislabeling straightforward quotes/events as framing.
      const hasQuote = /(?:"[^"\n]{5,}"|“[^”\n]{5,}”)/.test(claimText || '');
      const hasConcreteEventVerb = /\b(announced|said|stated|confirmed|denied|launched|started|ended|canceled|postponed|implemented|signed|passed|approved)\b/.test(t);
      if (hasQuote || hasConcreteEventVerb) return false;

      return patterns.some((p) => p.test(t));
    };
    
    return rawClaims.map(raw => {
      let type: ClaimType = ['QUOTE', 'EVENT', 'SCHEDULE', 'POLICY', 'FRAMING', 'OTHER'].includes(raw.type)
        ? (raw.type as ClaimType)
        : 'OTHER';

      // Conservative post-pass: reclassify subjective characterization as FRAMING.
      if (type !== 'FRAMING' && inferFramingType(raw.text || '')) {
        type = 'FRAMING';
      }

      return {
        text: raw.text || '',
        type,
      importance: typeof raw.importance === 'number' ? raw.importance : 0.5,
        checkability: assessCheckability(raw.text || '', type),
      evidence: [],
      verdict: 'Insufficient evidence' as const,
      verdictConfidence: 0,
      reasoning: '',
      evidenceSummary: {
        totalSources: 0,
        uniqueDomains: 0,
        supportingCount: 0,
        refutingCount: 0,
        averageCredibility: 0,
      },
      suggestedSearches: [],
      };
    });
  } catch (error) {
    console.error('Error extracting structured claims:', error);
    return [];
  }
}
