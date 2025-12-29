import type { AnalysisResult, TeachingTake, Claim, EvidenceItem } from './types';
import type { WritingMode, WritingProfile } from './writing-profile';
import { getWritingProfile, checkReadability } from './writing-profile';

/**
 * Generates a "BFM Breakdown" Teaching Take for Public Mode or Creator Mode.
 * 
 * PUBLIC MODE (default):
 * - 6th-grade reading level, plain language, calm but firm
 * - Pro-democracy, pro-rights, pro-worker, pro-marginalized communities
 * - Fast-to-scan: Topline + 3 bullet sections + Action Plan on first screen
 * - Separate VERIFIED FACTS vs UNCERTAINTIES vs "What to say back"
 * - Focus on behaviors/tactics, not character judgments
 * - Cite sources by outlet name [AP], [Reuters], [BBC]
 * - Do NOT invent sources, dates, or quotes
 * 
 * CREATOR MODE:
 * - More detailed analysis with full sections
 * - Extended rebuttals and talk tracks
 * - Deeper tactical breakdown
 */

interface EvidenceCluster {
  outlets: string[];
  snippets: string[];
  averageCredibility: number;
  stance: 'support' | 'refute' | 'context' | 'unclear';
}

interface TeachingTakeInput {
  topic: string;
  claims: Claim[];
  evidenceClusters: Map<string, EvidenceCluster>;
  framingRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
  framingFlags: string[];
  mode: WritingMode;
  profile: WritingProfile;
}

/**
 * Builds a system prompt for generating Teaching Takes
 */
export function buildTeachingTakePrompt(input: TeachingTakeInput): string {
  const { topic, claims, evidenceClusters, framingRiskLevel, framingFlags } = input;

  const claimsContext = claims.map((claim, idx) => {
    const evidenceSummary = claim.evidence
      .filter(e => e.role !== 'INPUT')
      .map(e => `    - [${e.publisher}]: "${e.snippet}" (credibility: ${e.credibility}, stance: ${e.stance})`)
      .join('\n');
    
    return `Claim ${idx + 1}:
  Text: "${claim.text}"
  Type: ${claim.type}
  Verdict: ${claim.verdict}
  Confidence: ${(claim.verdictConfidence * 100).toFixed(0)}%
  Evidence:
${evidenceSummary || '    (No corroborating evidence found)'}`;
  }).join('\n\n');

  const evidenceContext = Array.from(evidenceClusters.entries()).map(([claimId, cluster]) => {
    return `Evidence for "${claimId}":
  Outlets: ${cluster.outlets.join(', ')}
  Average credibility: ${cluster.averageCredibility.toFixed(2)}
  Stance: ${cluster.stance}`;
  }).join('\n\n');

  return `You are generating a "Teaching Take" for a misinformation defense tool.

Topic: ${topic}

Claims Analysis:
${claimsContext}

${evidenceContext ? `Evidence Clusters:\n${evidenceContext}\n` : ''}
Framing Risk Level: ${framingRiskLevel}
Framing Flags: ${framingFlags.join(', ')}

CRITICAL REQUIREMENTS:
1. Separate VERIFIED FACTS vs UNCERTAINTIES vs INTERPRETATION
2. Do NOT call anyone racist/undemocratic/evil unless the evidence explicitly proves that claim
3. Focus on BEHAVIORS/TACTICS: framing, scapegoating, insinuation, false certainty
4. Write at sixth-grade reading level: plain language, calm but firm
5. Cite sources by outlet name in brackets: [AP], [Reuters], [BBC]
6. Do NOT invent sources, dates, or quotes - only use what's provided above

Generate a comprehensive Teaching Take with:

1. EXECUTIVE SUMMARY (4-6 bullets)
   - Key takeaways about what's happening
   - Must be clear, factual, accessible

2. WHAT WE KNOW (bulleted list)
   - Each bullet tied to specific evidence clusters
   - Cite sources: [AP], [Reuters], etc.
   - Only facts that are verified

3. WHAT IS UNCERTAIN (bulleted list)
   - Explicitly state gaps and unknowns
   - What hasn't been verified
   - What needs more investigation

4. HOW THIS GETS SPUN (bulleted list)
   - Framing tactics used
   - Neutral tone describing manipulation
   - Focus on technique, not intent

5. PRO-DEMOCRACY TAKE (short paragraph)
   - Civic and rights framing
   - Emphasize democratic values
   - Constructive, not reactive

6. REBUTTAL SCRIPTS
   - Short (15-25 seconds): Quick response for casual conversation
   - Medium (60 seconds): More detailed for engaged discussion
   - Long (2-3 minutes): Comprehensive for serious conversation

7. TALK TRACKS (5 items)
   - "If they say X, say Y" format
   - Practical conversational responses
   - Evidence-based, not emotional

8. QUESTIONS TO ASK (5-7 items)
   - "What's your source?"
   - Questions that promote critical thinking
   - Non-confrontational but probing

9. WHAT TO SHARE INSTEAD (3-5 items)
   - Safer, more accurate alternatives
   - Reputable sources to reference
   - Better framings of the topic

10. ACTION PLAN
    - Today: Immediate steps (2-3 items)
    - This week: Short-term actions (2-3 items)
    - Ongoing: Long-term practices (2-3 items)

11. CITATIONS
    - Map claim IDs to evidence IDs
    - Ensure traceability

Use plain, accessible language. Be calm but firm. Focus on empowering people to think critically.`;
}

/**
 * Extracts evidence clusters from claims
 */
export function extractEvidenceClusters(claims: Claim[]): Map<string, EvidenceCluster> {
  const clusters = new Map<string, EvidenceCluster>();

  claims.forEach((claim) => {
    const corroboratingEvidence = claim.evidence.filter(e => e.role !== 'INPUT');
    
    if (corroboratingEvidence.length > 0) {
      const outlets = [...new Set(corroboratingEvidence.map(e => e.publisher))];
      const snippets = corroboratingEvidence.map(e => e.snippet);
      const avgCredibility = corroboratingEvidence.reduce((sum, e) => sum + e.credibility, 0) / corroboratingEvidence.length;
      
      // Determine overall stance
      const stanceCounts = {
        support: corroboratingEvidence.filter(e => e.stance === 'support').length,
        refute: corroboratingEvidence.filter(e => e.stance === 'refute').length,
        context: corroboratingEvidence.filter(e => e.stance === 'context').length,
        unclear: corroboratingEvidence.filter(e => e.stance === 'unclear').length,
      };
      
      const dominantStance = Object.entries(stanceCounts)
        .sort(([, a], [, b]) => b - a)[0][0] as 'support' | 'refute' | 'context' | 'unclear';

      clusters.set(claim.text, {
        outlets,
        snippets,
        averageCredibility: avgCredibility,
        stance: dominantStance,
      });
    }
  });

  return clusters;
}

/**
 * Determines framing risk level based on tactics score and flags
 */
export function assessFramingRisk(tacticsScore: number, flags: string[]): 'low' | 'medium' | 'high' | 'extreme' {
  const highRiskFlags = ['scapegoating', 'fear-mongering', 'false-certainty', 'us-vs-them'];
  const highRiskCount = flags.filter(flag => 
    highRiskFlags.some(risk => flag.toLowerCase().includes(risk))
  ).length;

  if (tacticsScore >= 70 || highRiskCount >= 3) return 'extreme';
  if (tacticsScore >= 50 || highRiskCount >= 2) return 'high';
  if (tacticsScore >= 30 || highRiskCount >= 1) return 'medium';
  return 'low';
}

/**
 * Prepares input for Teaching Take generation from AnalysisResult
 */
export function prepareTeachingTakeInput(
  analysisResult: AnalysisResult,
  topic?: string
): TeachingTakeInput {
  const evidenceClusters = extractEvidenceClusters(analysisResult.claims);
  const framingRiskLevel = assessFramingRisk(
    analysisResult.tactics.score_0_to_100,
    analysisResult.tactics.flags
  );

  // Generate topic from article meta or first claim
  const generatedTopic = topic || 
    analysisResult.article_meta.title || 
    (analysisResult.claims.length > 0 ? analysisResult.claims[0].text : 'Analysis');

  return {
    topic: generatedTopic,
    claims: analysisResult.claims,
    evidenceClusters,
    framingRiskLevel,
    framingFlags: analysisResult.tactics.flags,
    mode: 'public', // Default mode for legacy generator
    profile: getWritingProfile('public'),
  };
}

/**
 * Generates a Teaching Take using an LLM
 * 
 * @param analysisResult The analysis result from the propaganda check
 * @param topic Optional topic/title override
 * @param llmFunction A function that takes a prompt and returns LLM-generated content
 * @returns A TeachingTake object
 */
export async function generateTeachingTake(
  analysisResult: AnalysisResult,
  topic?: string,
  llmFunction?: (prompt: string) => Promise<string>
): Promise<TeachingTake> {
  const input = prepareTeachingTakeInput(analysisResult, topic);
  const prompt = buildTeachingTakePrompt(input);

  // If no LLM function provided, return a placeholder structure
  if (!llmFunction) {
    return createPlaceholderTeachingTake(input);
  }

  // Call LLM to generate the teaching take
  const response = await llmFunction(prompt);
  
  // Parse the response into a TeachingTake object
  // (This would need to be implemented based on the LLM's response format)
  return parseTeachingTakeResponse(response, input);
}

/**
 * Creates a placeholder Teaching Take structure
 */
function createPlaceholderTeachingTake(input: TeachingTakeInput): TeachingTake {
  const verifiedClaims = input.claims.filter(c => 
    c.verdict === 'Supported' || c.verdict === 'Likely supported'
  );
  
  const uncertainClaims = input.claims.filter(c =>
    c.verdict === 'Mixed/unclear' || c.verdict === 'No corroboration found' || c.verdict === 'Not verified yet'
  );

  return {
    topline: `${verifiedClaims.length} verified, ${uncertainClaims.length} need receipts, framing risk: ${input.framingRiskLevel}.`,
    what_to_say_back: `Hold on—let's check the facts first. Some of this is verified, but other parts need more evidence. What sources are you relying on?`,
    action_plan: {
      today: [
        'Share the verified facts with proper sources',
        'Label the uncertain claims as "needs verification"',
      ],
      this_week: [
        'Research the uncertain claims with credible sources',
        'Document the framing tactics you notice',
      ],
      ongoing: [
        'Track updates as new evidence emerges',
        'Build a habit of separating verified from unverified info',
      ],
    },
    executive_summary: `Analysis of "${input.topic}":\n• ${verifiedClaims.length} verified claims\n• ${uncertainClaims.length} uncertain or unverified claims\n• Framing risk: ${input.framingRiskLevel}\n• Key tactics: ${input.framingFlags.slice(0, 2).join(', ')}`,
    
    what_we_know: verifiedClaims.map((claim, idx) => {
      const outlets = claim.evidence
        .filter(e => e.role !== 'INPUT' && e.stance === 'support')
        .map(e => e.publisher)
        .slice(0, 3);
      const outletStr = outlets.length > 0 ? ` [${outlets.join('], [')}]` : '';
      return `${claim.text}${outletStr}`;
    }),
    
    what_is_unclear: uncertainClaims.map(claim => 
      `${claim.text} (Verdict: ${claim.verdict})`
    ),
    
    how_this_gets_spun: input.framingFlags.map(flag => 
      `Uses ${flag} to influence perception`
    ),
    
    pro_democracy_take: `This situation requires careful fact-checking and critical thinking. Democracy depends on informed citizens who can separate verified facts from speculation. We should focus on what's actually proven, ask questions about what's uncertain, and be aware of framing tactics that might influence our judgment.`,
    
    rebuttal_script: {
      short: `Hold on—let's check the facts first. Some of this is verified, but other parts need more evidence. What sources are you relying on?`,
      
      medium: `I've looked into this, and here's what we actually know: [summarize verified facts]. But there are also some claims that aren't backed up yet. We should be careful about accepting everything at face value, especially when the framing seems designed to provoke a strong reaction. What specific sources can verify the uncertain parts?`,
      
      long: `Let me break this down carefully. First, the verified facts: [list what_we_know items]. These are backed by credible sources. However, there are also unverified claims: [list uncertainties]. We don't have solid evidence for these yet.\n\nI'm also noticing some concerning framing tactics: [list tactics]. These can manipulate how we feel about the issue without adding real information.\n\nFrom a democratic perspective, we need to base our opinions on facts, not on emotional manipulation. Let's focus on what's actually proven, seek out additional credible sources for what's uncertain, and be aware when we're being pushed toward a particular conclusion. What matters most is that we're making informed decisions based on evidence.`,
    },
    
    talk_tracks: [
      'If they say "everyone knows this is true": Say "Actually, let\'s check which parts are verified and which aren\'t."',
      'If they say "the media is hiding this": Say "Which specific outlets have you checked? I found coverage from [credible sources]."',
      'If they say "it\'s obvious what\'s happening": Say "Can you point me to the evidence? I want to make sure I understand the facts."',
      'If they say "you can\'t trust any sources": Say "Some sources are more reliable than others. Which ones have good track records on this topic?"',
      'If they say "this proves [extreme conclusion]": Say "That\'s one interpretation. What does the actual evidence directly show?"',
    ],
    
    questions_to_ask: [
      'What\'s your source for that specific claim?',
      'Has this been verified by multiple credible outlets?',
      'What parts of this are definitely proven vs. still uncertain?',
      'Who benefits from this particular framing?',
      'What would change your mind about this?',
      'Have you read the full context, not just the headline?',
      'Are there credible sources that disagree?',
    ],
    
    what_to_share_instead: [
      'Fact-checks from AP, Reuters, or other wire services',
      'Original source documents rather than commentary',
      'Multiple perspectives from outlets with different editorial stances',
      'Academic or subject-matter expert analysis',
      'Data from official government or institutional sources',
    ],
    
    citations: input.claims.map((claim, idx) => ({
      claim_id: `claim_${idx + 1}`,
      evidence_ids: claim.evidence
        .filter(e => e.role !== 'INPUT')
        .map((e, eidx) => `evidence_${idx + 1}_${eidx + 1}`),
    })),
  };
}

/**
 * Parses LLM response into a TeachingTake object
 * (This is a simplified version - would need to be enhanced based on actual LLM output format)
 */
function parseTeachingTakeResponse(response: string, input: TeachingTakeInput): TeachingTake {
  // This would need sophisticated parsing logic
  // For now, fall back to the placeholder
  return createPlaceholderTeachingTake(input);
}

/**
 * Validates that a TeachingTake meets quality standards
 */
export function validateTeachingTake(teachingTake: TeachingTake): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!teachingTake.topline || teachingTake.topline.length < 10) {
    errors.push('Topline is missing or too short');
  }
  if (!teachingTake.what_to_say_back || teachingTake.what_to_say_back.length < 20) {
    errors.push('What to say back is missing or too short');
  }

  // Check executive summary if present (legacy field)
  if (teachingTake.executive_summary) {
    const bulletCount = teachingTake.executive_summary.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-')).length;
    if (bulletCount < 4 || bulletCount > 6) {
      errors.push(`Executive summary should have 4-6 bullets, found ${bulletCount}`);
    }
  }

  // Check rebuttal scripts if present (legacy field)
  if (teachingTake.rebuttal_script) {
    if (teachingTake.rebuttal_script.short && teachingTake.rebuttal_script.short.length < 50) {
      errors.push('Short rebuttal script is too brief');
    }
    if (teachingTake.rebuttal_script.medium && teachingTake.rebuttal_script.medium.length < 200) {
      errors.push('Medium rebuttal script is too brief');
    }
    if (teachingTake.rebuttal_script.long && teachingTake.rebuttal_script.long.length < 400) {
      errors.push('Long rebuttal script is too brief');
    }
  }

  // Check talk tracks if present (optional field)
  if (teachingTake.talk_tracks && teachingTake.talk_tracks.length < 5) {
    errors.push(`Talk tracks should have at least 5 items, found ${teachingTake.talk_tracks.length}`);
  }

  // Check action plan
  if (teachingTake.action_plan.today.length === 0) {
    errors.push('Action plan "today" section is empty');
  }
  if (teachingTake.action_plan.this_week.length === 0) {
    errors.push('Action plan "this week" section is empty');
  }
  if (teachingTake.action_plan.ongoing.length === 0) {
    errors.push('Action plan "ongoing" section is empty');
  }

  // Check citations if present (optional field)
  if (teachingTake.citations && teachingTake.citations.length === 0) {
    errors.push('No citations provided');
  }

  return errors;
}
