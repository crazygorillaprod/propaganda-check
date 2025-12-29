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
 * Builds a system prompt for generating BFM Breakdown Teaching Takes
 */
export function buildTeachingTakePrompt(input: TeachingTakeInput): string {
  const { topic, claims, evidenceClusters, framingRiskLevel, framingFlags, mode, profile } = input;

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

  // Public Mode uses a simplified, action-oriented prompt
  if (mode === 'public') {
    return `Write in "BFM Breakdown – Public Mode."

Topic: ${topic}

Claims Analysis:
${claimsContext}

${evidenceContext ? `Evidence Clusters:\n${evidenceContext}\n` : ''}
Framing Risk Level: ${framingRiskLevel}
Framing Flags: ${framingFlags.join(', ')}

Audience: normal American reader (6th grade).
Tone: calm but firm. Real talk. Pro-democracy. Pro-rights. Pro-worker. Pro–marginalized communities.
Goal: help readers understand, respond, and act.

WRITING RULES:
- Use short sentences (max ${profile.maxSentenceLength} words average).
- Plain words only. If jargon is needed, define it in one short line.
- Separate: What we know vs What's unclear vs What's opinion/framing.
- Do NOT call people racist/evil/undemocratic unless the evidence explicitly proves it.
- Focus on BEHAVIORS and TACTICS (name-calling, scapegoating, false certainty, etc.).
- Do NOT invent sources, quotes, or dates.
- Cite evidence by outlet names provided (e.g., [AP], [Reuters], [BBC]).
- Keep the first screen short: 1 topline sentence + 3 bullet sections + 3-step action plan.

OUTPUT STRUCTURE (JSON format):
{
  "mode": "public",
  "topline": "One sentence: here's what we can prove right now.",
  "what_we_know": [
    "Bullet 1 with [Source]",
    "Bullet 2 with [Source]",
    "Max 4 bullets"
  ],
  "what_is_unclear": [
    "What's missing or not verified",
    "Max 3 bullets"
  ],
  "what_to_say_back": "Short comment-ready response (2-3 sentences max, copyable). Use YOU language. Direct.",
  "action_plan": {
    "today": ["Action 1", "Action 2"],
    "this_week": ["Action 1", "Action 2"],
    "ongoing": ["Action 1", "Action 2"]
  },
  "how_this_gets_spun": [
    "Tactic 1: name the manipulation",
    "Tactic 2",
    "Optional, for 'Show details' section"
  ],
  "deeper_rebuttal": "Optional longer analysis for users who expand details. Still plain language."
}

Name the tactic. Name the impact. Demand the receipt.
Democracy needs proof. Not vibes. Not rumors.`;
  }

  // Professional Mode: journalist-safe, neutral, evidence-first
  return `You are generating a "Teaching Take" for an investigative research tool in PROFESSIONAL MODE.

This mode is for journalists, political professionals, and investigators.

Topic: ${topic}

Claims Analysis:
${claimsContext}

${evidenceContext ? `Evidence Clusters:\n${evidenceContext}\n` : ''}
Framing Risk Level: ${framingRiskLevel}
Framing Flags: ${framingFlags.join(', ')}

CRITICAL SAFETY RULES:
1. NEVER say "this person is racist/evil/undemocratic" - instead describe PATTERNS and EFFECTS
2. Use "This framing..." NOT "They intend..."
3. Use "This language has historically been used to..." NOT "This is designed to..."
4. Describe TACTICS and IMPACTS, not motives or character
5. Stay strictly neutral - present analysis, not advocacy
6. Cite sources explicitly: [AP], [Reuters], [BBC]
7. Separate: Facts → Gaps → Analysis → What would settle it

LANGUAGE SAFETY EXAMPLES:
✗ BAD: "This politician is racist"
✓ GOOD: "This framing targets [group] and has historically been associated with [pattern]"

✗ BAD: "They're trying to divide Americans"
✓ GOOD: "This narrative emphasizes group conflict and may increase polarization"

✗ BAD: "This is propaganda designed to manipulate voters"
✓ GOOD: "This content uses emotional appeals and selective framing common in persuasive messaging"

OUTPUT STRUCTURE (JSON format):
{
  "mode": "professional",
  "topline": "One sentence summary - strictly factual",
  "what_we_know": ["Verified facts with [Source]", "More detail than public mode", "Include dates, specifics"],
  "what_is_unclear": ["Evidence gaps with specificity", "What's missing to verify"],
  "what_to_say_back": "Neutral, fact-based response",
  "action_plan": {
    "today": ["Verify key claims", "Document sources"],
    "this_week": ["Follow up on gaps", "Cross-reference"],
    "ongoing": ["Track developments", "Update records"]
  },
  "narrative_analysis": {
    "dominant_frame": "Describe the primary framing used",
    "tactics_detected": ["Specific propaganda tactics - name them", "E.g., 'emotional appeal', 'false certainty'"],
    "emotional_triggers": ["Fear", "Anger", "Urgency", etc.],
    "repeated_phrases": ["Key phrases used multiple times"],
    "likely_effects": ["This framing may lead to...", "Describe patterns, not intent"]
  },
  "evidence_gaps": {
    "missing_evidence": ["What evidence is not provided"],
    "what_would_prove": ["What evidence would prove this claim"],
    "what_would_disprove": ["What evidence would disprove this claim"]
  },
  "how_this_gets_spun": ["Detailed framing analysis - neutral language"],
  "deeper_rebuttal": "Extended neutral analysis. Focus on patterns, not motives.",
  "rebuttal_script": {
    "short": "15-25 sec factual response",
    "medium": "60 sec evidence-based response",
    "long": "2-3 min comprehensive analysis"
  },
  "talk_tracks": ["Neutral question formats", "Evidence-focused responses"],
  "questions_to_ask": ["What evidence exists?", "What's the source?", "What would settle this?"],
  "what_to_share_instead": ["Primary sources", "Fact-checks", "Neutral reporting"]
}

Professional, neutral, journalist-safe. Describe patterns and effects, never motives or character.`;
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
  topic?: string,
  mode: WritingMode = 'public'
): TeachingTakeInput {
  const evidenceClusters = extractEvidenceClusters(analysisResult.claims);
  const framingRiskLevel = assessFramingRisk(
    analysisResult.tactics.score_0_to_100,
    analysisResult.tactics.flags
  );
  const profile = getWritingProfile(mode);

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
    mode,
    profile,
  };
}

/**
 * Generates a Teaching Take using an LLM
 * 
 * @param analysisResult The analysis result from the propaganda check
 * @param topic Optional topic/title override
 * @param mode Writing mode (public or creator)
 * @param llmFunction A function that takes a prompt and returns LLM-generated content
 * @returns A TeachingTake object
 */
export async function generateTeachingTake(
  analysisResult: AnalysisResult,
  topic?: string,
  mode: WritingMode = 'public',
  llmFunction?: (prompt: string) => Promise<string>
): Promise<TeachingTake> {
  const input = prepareTeachingTakeInput(analysisResult, topic, mode);
  const prompt = buildTeachingTakePrompt(input);

  // If no LLM function provided, return a placeholder structure
  if (!llmFunction) {
    return createPlaceholderTeachingTake(input);
  }

  // Call LLM to generate the teaching take
  const response = await llmFunction(prompt);
  
  // Parse the response into a TeachingTake object
  return parseTeachingTakeResponse(response, input);
}

/**
 * Creates a placeholder Teaching Take structure for Public Mode
 */
function createPlaceholderTeachingTake(input: TeachingTakeInput): TeachingTake {
  type ConfirmationLevel = 'CONFIRMED_PRIMARY' | 'CORROBORATED' | 'VERIFIED_STRONG' | 'NEEDS_MORE_EVIDENCE';

  const isFramingClaim = (c: Claim): boolean => c.type === 'FRAMING';

  const getPrimarySourceLabel = (): string => {
    const inputEvidence = input.claims.flatMap((c) => c.evidence.filter((e) => e.role === 'INPUT'));
    const first = inputEvidence[0];
    if (!first) return 'the provided article';
    return first.publisher || first.domain || 'the provided article';
  };

  const isOfficialLike = (e: EvidenceItem): boolean => {
    const d = (e.domain || e.publisher || '').toLowerCase();
    if (d.endsWith('.gov') || d.endsWith('.mil') || d.endsWith('.edu')) return true;
    if (d.endsWith('who.int') || d.endsWith('cdc.gov') || d.endsWith('nih.gov')) return true;
    return (e.credibilityScore ?? e.credibility ?? 0) >= 0.9;
  };

  const getSupportingCorroboration = (c: Claim): EvidenceItem[] =>
    (c.evidence || []).filter((e) => e.role !== 'INPUT' && e.stance === 'support');

  const getConfirmationLevel = (c: Claim): { level: ConfirmationLevel; supportingDomains: string[]; primaryDomain?: string } => {
    const primary = (c.evidence || []).find((e) => e.role === 'INPUT');
    const supporting = getSupportingCorroboration(c);
    const domains = Array.from(
      new Set(
        supporting
          .map((e) => (e.domain || e.publisher || '').trim())
          .filter(Boolean)
      )
    );

    const hasOfficialSupport = supporting.some(isOfficialLike);

    if (domains.length >= 2 || hasOfficialSupport) {
      return { level: 'VERIFIED_STRONG', supportingDomains: domains, primaryDomain: primary?.domain || primary?.publisher };
    }

    if (domains.length >= 1) {
      return { level: 'CORROBORATED', supportingDomains: domains, primaryDomain: primary?.domain || primary?.publisher };
    }

    if (primary) {
      return { level: 'CONFIRMED_PRIMARY', supportingDomains: [], primaryDomain: primary.domain || primary.publisher };
    }

    return { level: 'NEEDS_MORE_EVIDENCE', supportingDomains: [], primaryDomain: undefined };
  };

  const checkableClaims = input.claims.filter((c) => !isFramingClaim(c));
  const framingClaims = input.claims.filter((c) => isFramingClaim(c));

  const classified = checkableClaims.map((c) => ({ claim: c, ...getConfirmationLevel(c) }));

  const confirmedPrimary = classified.filter((x) => x.level === 'CONFIRMED_PRIMARY');
  const corroborated = classified.filter((x) => x.level === 'CORROBORATED');
  const verifiedStrong = classified.filter((x) => x.level === 'VERIFIED_STRONG');
  const needsMoreEvidence = classified.filter((x) => x.level === 'NEEDS_MORE_EVIDENCE');

  const confirmedCount = confirmedPrimary.length + corroborated.length + verifiedStrong.length;
  const needsCount = needsMoreEvidence.length;

  const topline = confirmedCount > 0
    ? `Confirmed: ${confirmedCount}. Needs more evidence: ${needsCount}.`
    : `No claims are confirmed from sources yet. Needs more evidence: ${needsCount}.`;

  const primarySourceLabel = getPrimarySourceLabel();

  const formatOutlets = (domains: string[]): string => {
    const short = domains.slice(0, 3);
    if (short.length === 0) return '';
    return ` [${short.join('], [')}]`;
  };

  const whatWeKnow: string[] = [];

  // 1) Confirmed in provided article (not corroborated)
  for (const item of confirmedPrimary.slice(0, 2)) {
    const label = item.primaryDomain || primarySourceLabel;
    whatWeKnow.push(`Confirmed in the provided article (not yet corroborated): ${item.claim.text} [${label}]`);
  }

  // 2) Corroborated elsewhere
  for (const item of [...corroborated, ...verifiedStrong].slice(0, Math.max(0, 4 - whatWeKnow.length))) {
    const outletStr = formatOutlets(item.supportingDomains);
    const prefix = item.level === 'VERIFIED_STRONG' ? 'Strongly verified' : 'Corroborated by other outlets';
    whatWeKnow.push(`${prefix}: ${item.claim.text}${outletStr}`);
  }

  const whatIsUnclear: string[] = [];

  for (const item of needsMoreEvidence.slice(0, 3)) {
    whatIsUnclear.push(`We still need independent reporting or official records to confirm: ${item.claim.text}`);
  }

  if (needsMoreEvidence.length === 0 && confirmedCount === 0) {
    whatIsUnclear.push('We need at least one credible source to confirm the key claims.');
  }

  // Build a clean, copy-paste rebuttal that matches certainty.
  const bestConfirm = (
    verifiedStrong[0] || corroborated[0] || confirmedPrimary[0] || needsMoreEvidence[0]
  )?.claim;

  const totalSupportingOutlets = Array.from(
    new Set(
      classified.flatMap((x) => x.supportingDomains)
    )
  );

  let whatToSayBack = '';
  if (bestConfirm) {
    if (verifiedStrong.length > 0) {
      whatToSayBack = `I’m not running with this off one post. Here’s what we can confirm from sources: ${bestConfirm.text}. Multiple outlets back it up${totalSupportingOutlets.length ? ` (${totalSupportingOutlets.slice(0, 2).join(', ')})` : ''}.`;
    } else if (corroborated.length > 0) {
      whatToSayBack = `I’m not running with this off one article. Here’s what we can confirm so far: ${bestConfirm.text}. One other outlet mentions it, but we still need stronger proof like an official statement or more independent reporting before we treat it as settled.`;
    } else if (confirmedPrimary.length > 0) {
      whatToSayBack = `I’m not running with this off one article. So far, we can confirm this was said in the provided article: ${bestConfirm.text}. But we still need a direct official statement or a second solid outlet confirming the details. Until then, don’t spread extra claims.`;
    } else {
      whatToSayBack = `I’m not running with this without receipts. I haven’t seen credible sources confirming the main details yet. If we’re going to share it, we need a direct statement or solid independent reporting first.`;
    }
  } else {
    whatToSayBack = `I’m not running with this without receipts. What’s the source? Let’s find credible reporting before we share it.`;
  }

  // Final cleanup: remove accidental double punctuation / spacing.
  whatToSayBack = whatToSayBack
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .replace(/\s+\./g, '.')
    .trim();

  const actionPlan = {
    today: [
      'Save the best source link',
      "Don't repost until it's verified",
    ],
    this_week: [
      'Check official sources (gov sites, local news)',
      'Talk to one person calmly using facts',
    ],
    ongoing: [
      'Support local journalism',
      'Vote in local elections',
    ],
  };

  const result: TeachingTake = {
    mode: input.mode as 'public' | 'professional',
    topline,
    what_we_know: whatWeKnow.length > 0 ? whatWeKnow : ['No claims are confirmed from sources yet.'],
    what_is_unclear: whatIsUnclear.length > 0 ? whatIsUnclear : ['No major evidence gaps detected from the current set of claims.'],
    what_to_say_back: whatToSayBack,
    action_plan: actionPlan,
    
    // Layer 2: Narrative analysis (all modes)
    narrative_analysis: {
      dominant_frame: input.framingFlags.length > 0 
        ? `Uses ${input.framingFlags[0]} as primary framing device`
        : 'No dominant framing detected',
      tactics_detected: input.framingFlags,
      emotional_triggers: deriveEmotionalTriggers(input.framingFlags),
      repeated_phrases: [], // Would be populated by actual analysis
      likely_effects: deriveLikelyEffects(input.framingRiskLevel, input.framingFlags),
    },
    
    // Evidence gaps (synthesis layer)
    evidence_gaps: {
      missing_evidence: needsMoreEvidence.map((x) => `Independent corroboration for: ${x.claim.text}`),
      what_would_prove: needsMoreEvidence.map((x) => `Official records, direct statements, or independent reporting confirming: ${x.claim.text}`),
      what_would_disprove: needsMoreEvidence.map((x) => `Credible reporting or primary evidence that contradicts: ${x.claim.text}`),
    },
  };

  // Route FRAMING claims into the spin section (don’t treat as facts).
  if (framingClaims.length > 0) {
    result.how_this_gets_spun = [
      ...framingClaims.slice(0, 4).map((c) => `Framing / characterization: ${c.text}`),
      ...input.framingFlags.slice(0, 4).map((flag) => `Spin tactic: ${flag}`),
    ];
  }

  // Add extended sections for professional mode
  if (input.mode === 'professional') {
    result.how_this_gets_spun = input.framingFlags.map(flag => 
      `Uses ${flag} as a persuasive technique`
    );
    result.deeper_rebuttal = `This content exhibits ${input.framingRiskLevel}-level framing characteristics. Observed tactics include ${input.framingFlags.slice(0, 3).join(', ')}. These patterns are commonly associated with persuasive messaging. Evidence-based analysis requires separating verified claims from unverified assertions and evaluating the framing techniques employed.`;

    const confirmedClaims = [...verifiedStrong, ...corroborated, ...confirmedPrimary].map((x) => x.claim);
    const needsClaims = needsMoreEvidence.map((x) => x.claim);

    result.rebuttal_script = {
      short: whatToSayBack,
      medium: `${whatToSayBack} Based on available evidence: ${confirmedClaims.slice(0, 2).map(c => c.text).join('; ') || 'no claims are confirmed yet'}. Additional claims require further verification. Recommend cross-referencing with primary sources and independent corroboration.`,
      long: `Evidence assessment: Confirmed items include ${confirmedClaims.map(c => c.text).join('. ') || 'none yet'}. Items needing more evidence include ${needsClaims.slice(0, 2).map(c => c.text).join('. ') || 'none flagged from the current set'}. The framing employs tactics such as ${input.framingFlags.slice(0, 2).join(' and ')}, which may influence interpretation independent of factual content. Recommend focusing on verifiable evidence and identifying what additional sources would be needed to substantiate remaining claims.`,
    };
    result.talk_tracks = [
      'Request: "Can you provide the original source for this claim?"',
      'Clarify: "Which specific outlets have reported this with attribution?"',
      'Probe: "What evidence would be needed to verify this assertion?"',
    ];
    result.questions_to_ask = [
      "What is the primary source?",
      'Has this been independently verified?',
      'What evidence is missing?',
      'What framing techniques are being employed?',
    ];
    result.what_to_share_instead = [
      'Primary source documents',
      'Wire service reporting (AP, Reuters)',
      'Fact-checking analysis',
      'Evidence gap assessment',
    ];
  }

  return result;
}

/**
 * Derive emotional triggers from framing flags
 */
function deriveEmotionalTriggers(framingFlags: string[]): string[] {
  const triggerMap: Record<string, string[]> = {
    'fear': ['Fear', 'Threat perception'],
    'anger': ['Anger', 'Outrage'],
    'urgency': ['Urgency', 'Time pressure'],
    'scapegoat': ['Blame', 'Group targeting'],
    'certainty': ['False certainty', 'Oversimplification'],
    'us-vs-them': ['Tribal identity', 'Group conflict'],
  };

  const triggers = new Set<string>();
  framingFlags.forEach(flag => {
    const flagLower = flag.toLowerCase();
    Object.entries(triggerMap).forEach(([key, values]) => {
      if (flagLower.includes(key)) {
        values.forEach(v => triggers.add(v));
      }
    });
  });

  return Array.from(triggers);
}

/**
 * Derive likely effects from framing risk and flags
 */
function deriveLikelyEffects(riskLevel: string, framingFlags: string[]): string[] {
  const effects: string[] = [];

  if (riskLevel === 'extreme' || riskLevel === 'high') {
    effects.push('May increase polarization and group conflict');
    effects.push('May encourage sharing without verification');
  }

  if (framingFlags.some(f => f.toLowerCase().includes('scapegoat'))) {
    effects.push('May direct blame toward specific groups');
  }

  if (framingFlags.some(f => f.toLowerCase().includes('fear') || f.toLowerCase().includes('urgency'))) {
    effects.push('May trigger emotional responses that bypass critical thinking');
  }

  if (framingFlags.some(f => f.toLowerCase().includes('certainty'))) {
    effects.push('May discourage questioning and evidence-seeking');
  }

  return effects.length > 0 ? effects : ['Standard persuasive framing patterns observed'];
}

/**
 * Parses LLM response into TeachingTake object
 * Attempts JSON parsing first, falls back to text parsing
 */
function parseTeachingTakeResponse(response: string, input: TeachingTakeInput): TeachingTake {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate required fields
      if (parsed.topline && parsed.what_we_know && parsed.what_is_unclear && parsed.what_to_say_back && parsed.action_plan) {
        return parsed as TeachingTake;
      }
    }
  } catch (e) {
    console.error('Failed to parse Teaching Take JSON:', e);
  }

  // Fallback to placeholder
  return createPlaceholderTeachingTake(input);
}
