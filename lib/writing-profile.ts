/**
 * Writing profiles for Teaching Take generation
 * Defines audience, tone, and output structure
 */

export type WritingMode = 'public' | 'professional' | 'journalist' | 'civic';

export interface WritingProfile {
  mode: WritingMode;
  audienceLevel: '6th_grade' | 'college' | 'professional';
  tone: 'calm_firm' | 'neutral_reporter' | 'educator' | 'organizer';
  stance: 'pro_democracy_pro_rights' | 'strictly_neutral' | 'advocacy_focused';
  target: 'general_public' | 'professionals' | 'newsrooms' | 'organizers';
  maxSentenceLength: number;
  maxParagraphLength: number;
  useJargon: boolean;
}

export const WRITING_PROFILES: Record<WritingMode, WritingProfile> = {
  public: {
    mode: 'public',
    audienceLevel: '6th_grade',
    tone: 'calm_firm',
    stance: 'pro_democracy_pro_rights',
    target: 'general_public',
    maxSentenceLength: 16,
    maxParagraphLength: 4,
    useJargon: false,
  },
  professional: {
    mode: 'professional',
    audienceLevel: 'professional',
    tone: 'neutral_reporter',
    stance: 'strictly_neutral',
    target: 'professionals',
    maxSentenceLength: 24,
    maxParagraphLength: 8,
    useJargon: true,
  },
  journalist: {
    mode: 'journalist',
    audienceLevel: 'professional',
    tone: 'neutral_reporter',
    stance: 'strictly_neutral',
    target: 'newsrooms',
    maxSentenceLength: 24,
    maxParagraphLength: 8,
    useJargon: true,
  },
  civic: {
    mode: 'civic',
    audienceLevel: 'college',
    tone: 'organizer',
    stance: 'advocacy_focused',
    target: 'organizers',
    maxSentenceLength: 18,
    maxParagraphLength: 5,
    useJargon: false,
  },
};

export function getWritingProfile(mode: WritingMode = 'public'): WritingProfile {
  return WRITING_PROFILES[mode];
}

/**
 * Readability metrics checker
 * Returns true if text meets profile standards
 */
export interface ReadabilityMetrics {
  avgSentenceLength: number;
  longSentenceCount: number;
  longWordCount: number;
  paragraphCount: number;
  avgParagraphLength: number;
  estimatedGradeLevel: number;
  passesProfile: boolean;
}

export function checkReadability(
  text: string,
  profile: WritingProfile
): ReadabilityMetrics {
  // Split into sentences (simple heuristic)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);

  const longSentences = sentences.filter(s => {
    const sentenceWords = s.split(/\s+/).length;
    return sentenceWords > profile.maxSentenceLength;
  });

  const longWords = words.filter(w => {
    // Remove punctuation for word counting
    const cleanWord = w.replace(/[^\w]/g, '');
    return cleanWord.length > 8;
  });

  // Split into paragraphs (double newline)
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const avgParagraphLength = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.split(/[.!?]+/).length, 0) / paragraphs.length
    : 0;

  // Simple grade level estimate (Flesch-Kincaid approximation)
  const syllableCount = words.reduce((sum, word) => {
    return sum + estimateSyllables(word);
  }, 0);

  const estimatedGradeLevel =
    0.39 * avgSentenceLength +
    11.8 * (syllableCount / Math.max(words.length, 1)) -
    15.59;

  // Check if passes profile
  const passesProfile =
    longSentences.length < sentences.length * 0.2 && // max 20% long sentences
    longWords.length < words.length * 0.15 && // max 15% long words
    avgParagraphLength <= profile.maxParagraphLength &&
    (profile.audienceLevel === 'professional' || estimatedGradeLevel <= 8);

  return {
    avgSentenceLength,
    longSentenceCount: longSentences.length,
    longWordCount: longWords.length,
    paragraphCount: paragraphs.length,
    avgParagraphLength,
    estimatedGradeLevel: Math.round(estimatedGradeLevel * 10) / 10,
    passesProfile,
  };
}

function estimateSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
  if (cleanWord.length <= 3) return 1;

  // Count vowel groups
  let count = 0;
  let prevWasVowel = false;

  for (const char of cleanWord) {
    const isVowel = /[aeiouy]/.test(char);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }

  // Adjust for silent e
  if (cleanWord.endsWith('e')) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}
