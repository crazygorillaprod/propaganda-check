import type { AnalysisResult, TeachingTake } from '@/lib/types';

export const demoTopic =
  'City council passed a plastic bag ban, and a claim that it will cut waste by 50% in a year.';

export const demoAnalysisResult: AnalysisResult = {
  article_meta: {
    title: 'Demo: Local ordinance and impact claims',
    canonical_url: 'https://example.com/demo/plastic-bag-ordinance',
    publisher: 'Example Gazette',
    author: 'Staff',
    published_at: '2025-07-02',
    detected_via: 'domain-fallback',
    sourceType: 'news',
  },
  claims: [
    {
      text: 'The city council voted 7–2 on July 1, 2025 to pass an ordinance banning single-use plastic checkout bags starting January 1, 2026.',
      type: 'EVENT',
      importance: 0.86,
      checkability: 0.92,
      evidence: [
        {
          role: 'CORROBORATION',
          url: 'https://www.example.gov/council/meetings/2025-07-01',
          title: 'City Council Meeting Minutes — July 1, 2025',
          domain: 'example.gov',
          publisher: 'City Council',
          published_at: '2025-07-01',
          snippet:
            'Minutes show a final vote of 7–2 approving Ordinance 2025-18. The ordinance prohibits distribution of single-use plastic checkout bags effective January 1, 2026.',
          stance: 'support',
          credibility: 0.92,
          confidence: 0.85,
        },
        {
          role: 'CORROBORATION',
          url: 'https://www.examplegazette.com/local/ordinance-2025-18-bag-ban',
          title: 'Council passes Ordinance 2025-18 after debate',
          domain: 'examplegazette.com',
          publisher: 'Example Gazette',
          published_at: '2025-07-02',
          snippet:
            'The council approved the bag ordinance 7–2. The measure begins in 2026 and includes a phase-in for retailers.',
          stance: 'support',
          credibility: 0.74,
          confidence: 0.62,
        },
      ],
      verdict: 'Supported',
      verdictConfidence: 0.8,
      reasoning:
        'Multiple sources (including official minutes) support the vote count, date, and effective date.',
      evidenceSummary: {
        totalSources: 2,
        uniqueDomains: 2,
        supportingCount: 2,
        refutingCount: 0,
        averageCredibility: 0.83,
      },
      suggestedSearches: [
        'Ordinance 2025-18 single-use plastic bag ban effective date',
        'city council vote 7-2 July 1 2025 ordinance 2025-18',
      ],
    },
    {
      text: 'The ordinance will reduce plastic waste by 50% within a year.',
      type: 'OTHER',
      importance: 0.74,
      checkability: 0.55,
      evidence: [
        {
          role: 'CORROBORATION',
          url: 'https://www.exampleuniversity.edu/policy/plastic-bag-bans-meta-analysis',
          title: 'What plastic bag bans do (and don’t) change: a review',
          domain: 'exampleuniversity.edu',
          publisher: 'Example University',
          published_at: '2023-11-15',
          snippet:
            'Studies show mixed outcomes depending on enforcement, consumer substitution, and baseline usage; results vary substantially by jurisdiction.',
          stance: 'context',
          credibility: 0.86,
          confidence: 0.58,
        },
        {
          role: 'CORROBORATION',
          url: 'https://www.example.gov/sustainability/ordinance-2025-18-faq',
          title: 'Ordinance 2025-18 FAQ (Sustainability Office)',
          domain: 'example.gov',
          publisher: 'Sustainability Office',
          published_at: '2025-06-28',
          snippet:
            'The city expects reductions in checkout bag distribution, but specific waste reduction percentages are estimates and depend on behavior and compliance.',
          stance: 'unclear',
          credibility: 0.8,
          confidence: 0.4,
        },
      ],
      verdict: 'Mixed/unclear',
      verdictConfidence: 0.45,
      reasoning:
        'Available sources discuss impacts as variable and do not clearly establish a 50% waste reduction within one year for this specific ordinance.',
      evidenceSummary: {
        totalSources: 2,
        uniqueDomains: 2,
        supportingCount: 0,
        refutingCount: 0,
        averageCredibility: 0.83,
      },
      suggestedSearches: [
        'measured waste reduction after plastic bag ban one year',
        'Ordinance 2025-18 projected waste reduction 50 percent source',
      ],
    },
  ],
  overall_score: {
    score: 78,
    confidence: 0.7,
    breakdown: {
      attribution: 22,
      corroboration_1: 26,
      corroboration_2plus: 14,
      specificity: 16,
    },
    status: 'EVIDENCE_FOUND',
    message: 'Evidence found for key factual elements; impact estimates remain uncertain.',
    retrieval_state: 'RAN_WITH_RESULTS',
  },
  overallVerifiability: {
    score: 78,
    confidence: 0.7,
    breakdown: {
      attribution: 22,
      corroboration_1: 26,
      corroboration_2plus: 14,
      specificity: 16,
    },
    status: 'EVIDENCE_FOUND',
    message: 'Evidence found for key factual elements; impact estimates remain uncertain.',
    retrieval_state: 'RAN_WITH_RESULTS',
  },
  tactics: {
    score_0_to_100: 33,
    flags: ['Uses a precise percentage without clear sourcing', 'Collapses a long-term outcome into a short timeframe'],
    explanation:
      'The factual vote claim is straightforward and corroborated. The impact claim uses a strong number (50%) and a short timeline (one year) without clear evidence, which is a common persuasion pattern.',
  },
  rebuttal: {
    short:
      "The vote and ordinance details are easy to verify in the council minutes. The '50% in a year' impact claim needs a specific source and measured baseline—otherwise it’s an estimate, not a fact.",
    medium:
      'The council vote and effective date are corroborated by official records. Where things get fuzzy is the promised outcome: a 50% waste reduction in one year. Impacts vary widely by enforcement and consumer substitution. If someone is citing 50%, ask for the source methodology, the baseline, and what exactly is being measured.',
  },
  debug: {
    demo: true,
    note: 'This is preloaded demo content intended for feature walkthroughs.',
  },
};

export const demoTeachingTake: TeachingTake = {
  executive_summary:
    '• The ordinance vote and timeline are verifiable from official records.\n• The “50% in a year” claim is an impact estimate and needs a source.\n• Don’t repeat numbers unless you can cite the method and baseline.\n• Safer wording: “the city expects reductions, but the size depends on compliance.”',
  what_we_know: [
    'The council passed an ordinance restricting single-use plastic checkout bags (effective date specified in official documentation).',
    'Coverage and implementation details typically include phase-in periods and retailer guidance.',
  ],
  what_is_uncertain: [
    'The exact magnitude of waste reduction attributable to the ordinance within a one-year window.',
    'Whether substitution effects (paper bags, thicker reusable bags) offset some expected gains.',
  ],
  how_this_gets_spun: [
    'A specific percentage (“50%”) is used to project confidence and shut down questions.',
    'A short timeframe (“within a year”) creates urgency and implied inevitability.',
    'Opponents may cherry-pick counterexamples from other cities to claim bans never work.',
  ],
  pro_democracy_take:
    'Policy debates are healthier when we separate verifiable facts (what passed, when it starts) from projections (how much it will change outcomes). If you care about credibility, cite the official ordinance for the facts and treat percentage impacts as hypotheses that should be measured.',
  rebuttal_script: {
    short:
      'The vote and ordinance details are in the council minutes. The “50% in a year” number needs a cited study or city methodology—otherwise it’s a guess.',
    medium:
      'We can verify the ordinance details in official records. The impact claim is the part that needs receipts: what baseline, what measurement, what timeframe, and what evidence from comparable cities? Until those are cited, it’s more accurate to say the city expects reductions but the size depends on behavior and compliance.',
    long:
      'Here’s the clean way to talk about this without overstating: (1) The ordinance passed and here’s the official record. (2) The expected outcomes depend on enforcement and consumer behavior, and different cities see different results. (3) If someone claims a precise 50% reduction in a year, ask for the study or methodology and whether it measures bag distribution, litter audits, or overall plastic waste. Facts build trust; projections should be labeled as projections.',
  },
  talk_tracks: [
    'If they say “It’s 50% within a year,” say: “What’s the source and what baseline are they using?”',
    'If they say “Bans never work,” say: “Outcomes vary—let’s look at measured results in comparable cities.”',
    'If they say “This is settled,” say: “The ordinance details are settled; the impact should be measured.”',
  ],
  questions_to_ask: [
    'Where does the 50% figure come from (study, city memo, or model)?',
    'What exactly is being measured: bag distribution, litter, or total plastic waste?',
    'What baseline year and compliance assumptions are used?',
  ],
  what_to_share_instead: [
    'The council minutes / ordinance text confirming the vote and effective date.',
    'A review of bag-ban outcomes showing variability and the importance of measurement.',
    'A statement like: “The city expects reductions, but the magnitude depends on compliance.”',
  ],
  action_plan: {
    today: [
      'Link the official council minutes / ordinance text when discussing the vote.',
      'Avoid repeating the 50% number unless you can cite a specific method and baseline.',
    ],
    this_week: [
      'Collect 2–3 comparable-city case studies with measured outcomes.',
      'Define what you mean by “plastic waste” (bags distributed vs. litter audits).',
    ],
    ongoing: [
      'Update your claims as real measurements become available.',
      'Keep a small “receipts folder” of official docs and neutral research summaries.',
    ],
  },
  citations: [
    { claim_id: 'claim_1', evidence_ids: ['example.gov/council/meetings/2025-07-01'] },
    { claim_id: 'claim_2', evidence_ids: ['exampleuniversity.edu/policy/plastic-bag-bans-meta-analysis'] },
  ],
};
