/**
 * Evidence Retrieval API Examples
 * 
 * This file demonstrates how to use the external evidence retrieval system.
 */

import { getSearchClient, build_queries_for_claim, retrieve_evidence_for_claim } from '../lib/search-client';
import { scoreEvidence, analyzeSourceStance } from '../lib/evidence';
import { calculateOverallVerifiability } from '../lib/verifiability';
import OpenAI from 'openai';
import type { Claim } from '../lib/types';

/**
 * Example 1: Basic evidence retrieval for a single claim
 */
async function example1_basicRetrieval() {
  const claim = 'Inflation rose to 8.5 percent in March 2024';
  
  // Step 1: Build search queries
  const queries = build_queries_for_claim(claim);
  console.log('Search queries:', queries);
  // Output: ['Inflation rose to 8.5 percent in March 2024', '8.5 Inflation...', 'Inflation March']
  
  // Step 2: Retrieve evidence
  const evidence = await retrieve_evidence_for_claim(claim);
  console.log(`Found ${evidence.length} evidence items`);
  // Output: Array of SearchResult (0-6 items depending on API availability)
  
  return evidence;
}

/**
 * Example 2: Complete evidence scoring with attribution
 */
async function example2_scoringWithAttribution() {
  const claim = 'President Biden said unemployment is at historic lows';
  
  // Retrieve evidence
  const searchResults = await retrieve_evidence_for_claim(claim);
  
  // Score evidence with attribution boost
  const evidenceItems = await scoreEvidence(
    claim,
    searchResults,
    'DIRECT_QUOTE' // Attribution type boosts confidence
  );
  
  evidenceItems.forEach(item => {
    console.log({
      title: item.title,
      publisher: item.publisher,
      confidence: item.confidence, // Will be higher due to attribution
      url: item.url,
    });
  });
  
  return evidenceItems;
}

/**
 * Example 3: Stance analysis with OpenAI
 */
async function example3_stanceAnalysis() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const claim = 'Climate change is accelerating faster than predicted';
  
  // Retrieve and score evidence
  const searchResults = await retrieve_evidence_for_claim(claim);
  let evidenceItems = await scoreEvidence(claim, searchResults);
  
  // Analyze stance of each source
  evidenceItems = await analyzeSourceStance(claim, evidenceItems, openai);
  
  evidenceItems.forEach(item => {
    console.log({
      title: item.title,
      stanceTowardsClaim: item.stanceTowardsClaim, // 'supports', 'refutes', 'neutral', 'unclear'
      supports_claim: item.supports_claim, // boolean
    });
  });
  
  return evidenceItems;
}

/**
 * Example 4: Complete claim verification flow
 */
async function example4_completeFlow() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const claim: Claim = {
    text: 'The unemployment rate dropped to 3.7% last month',
    type: 'EVENT',
    importance: 0.9,
    checkability: 0.95,
    evidence: [],
    verdict: 'Insufficient evidence',
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
  
  // 1. Retrieve evidence
  const searchResults = await retrieve_evidence_for_claim(claim.text);
  
  // 2. Score evidence
  claim.evidence = await scoreEvidence(claim.text, searchResults);
  
  // 3. Analyze stance
  claim.evidence = await analyzeSourceStance(claim.text, claim.evidence, openai);
  
  // 4. Calculate evidence summary
  const uniqueDomains = new Set(claim.evidence.map(e => e.publisher)).size;
  const avgCredibility = claim.evidence.length > 0
    ? claim.evidence.reduce((sum, e) => sum + (e.credibilityScore || 0), 0) / claim.evidence.length
    : 0;
  
  claim.evidenceSummary = {
    totalSources: claim.evidence.length,
    uniqueDomains,
    supportingCount: claim.evidence.filter(e => e.supports_claim).length,
    refutingCount: claim.evidence.filter(e => e.stanceTowardsClaim === 'refutes').length,
    averageCredibility: avgCredibility,
  };
  
  console.log('Evidence Summary:', claim.evidenceSummary);
  
  return claim;
}

/**
 * Example 5: Verifiability status handling
 */
async function example5_statusHandling() {
  const searchClient = getSearchClient();
  const searchEnabled = searchClient.isAvailable();
  
  console.log('Search enabled:', searchEnabled);
  // true if BRAVE_SEARCH_API_KEY is set, false otherwise
  
  const claims: Claim[] = [
    {
      text: 'Test claim',
      type: 'EVENT',
      importance: 0.8,
      checkability: 0.9,
      evidence: [],
      verdict: 'Insufficient evidence',
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
    },
  ];
  
  const result = calculateOverallVerifiability(claims, searchEnabled);
  
  if (result.status === 'NOT_RUN') {
    console.log('Status: NOT_RUN');
    console.log('Score:', result.score); // null
    console.log('Message:', result.message); // 'Evidence retrieval not run (missing API key or disabled).'
  } else if (result.status === 'NO_EVIDENCE_FOUND') {
    console.log('Status: NO_EVIDENCE_FOUND');
    console.log('Score:', result.score); // 0
    console.log('Message:', result.message); // 'Evidence retrieval ran but no sources were found.'
  } else if (result.status === 'EVIDENCE_FOUND') {
    console.log('Status: EVIDENCE_FOUND');
    console.log('Score:', result.score); // 0-100
    console.log('Breakdown:', result.breakdown);
    // {
    //   attribution: 0-30,
    //   corroboration_1: 0-30,
    //   corroboration_2plus: 0-20,
    //   specificity: 0-20
    // }
  }
  
  return result;
}

/**
 * Example 6: Domain exclusion for self-citation prevention
 */
async function example6_domainExclusion() {
  const claim = 'Article makes economic claims';
  const articleDomain = 'example-news.com';
  
  // Exclude the article's own domain from evidence search
  const evidence = await retrieve_evidence_for_claim(claim, [articleDomain]);
  
  // Evidence will not include any results from example-news.com
  console.log('Evidence domains:', evidence.map(e => new URL(e.url).hostname));
  
  return evidence;
}

/**
 * Example 7: Check if search is available before attempting retrieval
 */
function example7_checkAvailability() {
  const searchClient = getSearchClient();
  
  if (!searchClient.isAvailable()) {
    console.log('Search is not available. Possible reasons:');
    console.log('1. BRAVE_SEARCH_API_KEY environment variable not set');
    console.log('2. API key is empty or invalid');
    console.log('\nVerifiability status will be NOT_RUN with null score.');
    return false;
  }
  
  console.log('Search is available. Evidence retrieval enabled.');
  return true;
}

/**
 * Example 8: Manual search query building
 */
function example8_queryBuilding() {
  // Simple claim
  const claim1 = 'prices are rising';
  console.log('Queries for simple claim:', build_queries_for_claim(claim1));
  // ['prices are rising']
  
  // Claim with numbers
  const claim2 = 'Unemployment dropped to 3.7%';
  console.log('Queries with numbers:', build_queries_for_claim(claim2));
  // ['Unemployment dropped to 3.7%', '3.7 Unemployment...']
  
  // Claim with proper nouns
  const claim3 = 'President Biden announced new policies';
  console.log('Queries with entities:', build_queries_for_claim(claim3));
  // ['President Biden announced new policies', 'President Biden']
  
  // Claim with quoted phrase
  const claim4 = 'Expert said "situation is critical"';
  console.log('Queries with quotes:', build_queries_for_claim(claim4));
  // ['Expert said "situation is critical"', '"situation is critical"']
}

// Export examples for documentation
export {
  example1_basicRetrieval,
  example2_scoringWithAttribution,
  example3_stanceAnalysis,
  example4_completeFlow,
  example5_statusHandling,
  example6_domainExclusion,
  example7_checkAvailability,
  example8_queryBuilding,
};
