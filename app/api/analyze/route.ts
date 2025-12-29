import OpenAI from "openai";
import { ArticleMeta, Claim, EvidenceItem, AnalysisResult } from "@/lib/types";
import { fetchArticleMeta } from "@/lib/article-meta";
import { analyzeCheckability, extractStructuredClaims, rankClaimImportance } from "@/lib/claims";
import { scoreEvidence, analyzeSourceStance } from "@/lib/evidence";
import {
  calculateOverallVerifiability,
  identifyEvidenceGaps,
  generateSmartSearches,
} from "@/lib/verifiability";
import {
  getSearchClient,
  retrieve_evidence_for_claim,
  type SearchResult,
} from "@/lib/search-client";
import { sanitizeUrl, stripHtml } from "@/lib/sanitize";
import { applyStanceGuardrails } from "@/lib/stance-guardrails";
import { buildInputEvidenceForClaim } from "@/lib/input-evidence";
import { 
  checkQuota, 
  recordUsage, 
  calculateAnalysisCost,
  type UsageTier 
} from "@/lib/metering";
import { 
  generateInputHash, 
  lookupCache, 
  cacheAnalysis 
} from "@/lib/cache";
import { getEffectiveTier } from "@/lib/user-store";


export const runtime = "nodejs";

type BraveWeb = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      age?: string;
    }>;
  };
};

type Source = { title: string; url: string; snippet?: string; age?: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isTacticsShape(value: unknown): value is AnalysisResult['tactics'] {
  if (!isObject(value)) return false;
  return (
    typeof value.score_0_to_100 === 'number' &&
    isStringArray(value.flags) &&
    typeof value.explanation === 'string'
  );
}

function isRebuttalShape(value: unknown): value is NonNullable<AnalysisResult['rebuttal']> {
  if (!isObject(value)) return false;
  if (typeof value.short !== 'string') return false;
  if (value.medium !== undefined && typeof value.medium !== 'string') return false;
  return true;
}

function isUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function deriveDeterministicVerdict(
  claim: Claim,
  retrievalState: 'NOT_RUN' | 'RAN_NO_RESULTS' | 'RAN_WITH_RESULTS'
): { verdict: Claim['verdict']; verdictConfidence: number; reasoning: string } {
  if (retrievalState === 'NOT_RUN') {
    return {
      verdict: 'Not verified yet',
      verdictConfidence: 0,
      reasoning: 'Evidence retrieval not run for this analysis.',
    };
  }

  const allEvidence: EvidenceItem[] = claim.evidence || [];
  const corroborationEvidence = allEvidence.filter((e) => e.role !== 'INPUT');
  const hasInputEvidence = allEvidence.some((e) => e.role === 'INPUT');

  if (corroborationEvidence.length === 0) {
    if (hasInputEvidence) {
      return {
        verdict: 'Appears in provided source (not yet corroborated)',
        verdictConfidence: 0,
        reasoning: 'This claim appears in the provided source, but no external corroboration was retrieved yet.',
      };
    }

    return {
      verdict: 'No corroboration found',
      verdictConfidence: 0,
      reasoning: 'Search ran but returned no corroborating sources for this claim.',
    };
  }

  const evidence = corroborationEvidence;

  const supports = evidence.filter((e) => e.stance === 'support');
  const refutes = evidence.filter((e) => e.stance === 'refute');

  const avg = (items: typeof evidence) => {
    const vals = items
      .map((e) => (typeof e.confidence === 'number' ? e.confidence : 0))
      .filter((n) => n > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const supportConf = avg(supports);
  const refuteConf = avg(refutes);

  if (supports.length > 0 && refutes.length === 0) {
    if (supportConf >= 0.60) {
      return {
        verdict: 'Supported',
        verdictConfidence: supportConf,
        reasoning: `At least ${supports.length} source(s) explicitly support this claim.`,
      };
    }
    if (supportConf >= 0.40) {
      return {
        verdict: 'Likely supported',
        verdictConfidence: supportConf,
        reasoning: `At least ${supports.length} source(s) support this claim, but the match is not fully explicit.`,
      };
    }
    return {
      verdict: 'Mixed/unclear',
      verdictConfidence: supportConf,
      reasoning: 'Sources appear relevant, but do not explicitly confirm this specific claim.',
    };
  }

  if (refutes.length > 0 && supports.length === 0) {
    if (refuteConf >= 0.60) {
      return {
        verdict: 'Not supported',
        verdictConfidence: refuteConf,
        reasoning: `At least ${refutes.length} source(s) explicitly refute this claim.`,
      };
    }
    return {
      verdict: 'Mixed/unclear',
      verdictConfidence: refuteConf,
      reasoning: 'Some sources suggest this claim may be false, but the refutation is not explicit.',
    };
  }

  if (supports.length > 0 && refutes.length > 0) {
    return {
      verdict: 'Mixed/unclear',
      verdictConfidence: Math.max(supportConf, refuteConf),
      reasoning: 'There is both supporting and refuting evidence across sources.',
    };
  }

  return {
    verdict: 'Mixed/unclear',
    verdictConfidence: 0.3,
    reasoning: 'Sources are relevant context but do not confirm or refute this claim.',
  };
}

function getBaseDomain(urlStr: string) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBadCitation(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.toLowerCase();

    // junk pages
    if (path === "/" || path.length < 2) return true;
    if (path.includes("/terms")) return true;
    if (path.includes("/privacy")) return true;
    if (path.includes("/about")) return true;

    // AP hub pages
    if (host.endsWith("apnews.com") && path.startsWith("/hub/")) return true;

    // shallow category/tag pages like /politics
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return true;

    return false;
  } catch {
    return true;
  }
}

function dedupeByDomain(sources: Source[], max = 4) {
  const seen = new Set<string>();
  const out: Source[] = [];

  for (const s of sources) {
    if (!s?.url || isBadCitation(s.url)) continue;
    try {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      if (seen.has(host)) continue;
      seen.add(host);
      out.push({
        title: s.title || host,
        url: s.url,
        snippet: s.snippet || "",
        age: s.age || "",
      });
      if (out.length >= max) break;
    } catch {}
  }
  return out;
}

function countUniqueDomains(sources: Source[]) {
  const set = new Set<string>();
  for (const s of sources) {
    try {
      const host = new URL(s.url).hostname.replace(/^www\./, "");
      set.add(host);
    } catch {}
  }
  return set.size;
}

async function braveSearch(query: string, excludeDomains: string[] = []) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return { usedQuery: query, results: [] as Source[] };

  const excludes = excludeDomains
    .filter(Boolean)
    .map((d) => ` -site:${d}`)
    .join("");

  const usedQuery = `${query}${excludes}`;

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", usedQuery);
  url.searchParams.set("count", "8");
  url.searchParams.set("safesearch", "moderate");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("Brave error:", res.status, text);
    return { usedQuery, results: [] as Source[] };
  }

  let data: BraveWeb | null = null;
  try {
    data = JSON.parse(text) as BraveWeb;
  } catch {
    console.error("Brave JSON parse error:", text.slice(0, 200));
    return { usedQuery, results: [] as Source[] };
  }

  const results = data?.web?.results ?? [];
  const mapped: Source[] = results
    .map((r) => ({
      title: (r.title || "").trim(),
      url: (r.url || "").trim(),
      snippet: (r.description || "").trim(),
      age: (r.age || "").trim(),
    }))
    .filter((r) => r.title && r.url && !isBadCitation(r.url));

  return { usedQuery, results: mapped.slice(0, 8) };
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { input: rawInput, userId, tier, email } = body;

    if (!rawInput || typeof rawInput !== "string" || rawInput.trim().length < 8) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const input = isUrl(rawInput.trim()) ? sanitizeUrl(rawInput.trim()) : rawInput.trim();
    
    // Determine input type and tier
    const inputType: 'url' | 'text' = isUrl(input) ? 'url' : 'text';

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const effectiveUserId = normalizedEmail || 'anonymous';

    // IMPORTANT: do not trust client-provided tier.
    // Only a verified email with a server-side tier can unlock paid usage.
    const userTier: UsageTier = normalizedEmail ? getEffectiveTier(normalizedEmail) : 'free';
    
    // Generate cache hash
    const inputHash = generateInputHash(inputType, input);
    
    // Check cache first (doesn't count against quota)
    console.log(`[Metering] Checking cache for hash: ${inputHash.substring(0, 12)}...`);
    const cached = await lookupCache(inputHash);
    
    if (cached) {
      console.log(`[Metering] Cache hit! Returning cached result (saved $${cached.original_cost.toFixed(3)})`);
      
      // Record cache hit (minimal cost, doesn't count as fact check)
      await recordUsage(effectiveUserId, userTier, 'analysis_run', {
        inputType,
        inputHash,
        costEstimate: 0,
        apisCalled: [],
        claimsExtracted: cached.analysis_result.claims.length,
        evidenceRetrieved: cached.analysis_result.claims.reduce((sum, c) => sum + c.evidence.length, 0),
        usedCache: true,
        processingTimeMs: Date.now() - startTime,
      });
      
      return Response.json({
        ...cached.analysis_result,
        _meta: {
          cached: true,
          cost: 0,
          cache_saved: cached.original_cost,
          processing_time_ms: Date.now() - startTime,
        }
      });
    }
    
    // Check quota before performing expensive analysis
    console.log(`[Metering] Checking quota for user: ${effectiveUserId}, tier: ${userTier}`);
    const quotaCheck = await checkQuota(effectiveUserId, userTier, 'fact_check');
    
    if (!quotaCheck.allowed) {
      console.log(`[Metering] Quota exceeded: ${quotaCheck.reason}`);
      return Response.json(
        {
          error: 'Quota exceeded',
          message: quotaCheck.reason,
          remaining: quotaCheck.remaining,
          total_available: quotaCheck.total_available,
          upgrade_required: true,
        },
        { status: 429 }
      );
    }
    
    console.log(`[Metering] Quota OK - ${quotaCheck.remaining} checks remaining`);

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const inputIsUrl = isUrl(input);
    const inputDomain = inputIsUrl ? getBaseDomain(input) : "";

    // 1) Fetch article metadata for URLs
    let articleMeta: ArticleMeta = { sourceType: 'unknown' as const };
    let urlContext = "";
    let fullArticleText = ""; // Store for attribution detection
    
    if (inputIsUrl) {
      // First, try to fetch and parse HTML for better metadata
      let htmlMeta: Partial<ArticleMeta> | null = null;
      try {
        console.log(`[HTML Fetch] Attempting to fetch: ${input}`);
        const htmlResponse = await fetch(input, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PropagandaBuster/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (htmlResponse.ok) {
          console.log(`[HTML Fetch] Success (${htmlResponse.status}) - ${htmlResponse.headers.get('content-type')}`);
          const html = await htmlResponse.text();
          const { extract_article_meta } = await import('@/lib/html-parser');
          htmlMeta = extract_article_meta(html, input);
          
          // Extract text content for attribution detection (remove HTML tags)
          fullArticleText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log(`[HTML Fetch] Extracted ${fullArticleText.length} chars of article text`);
        } else {
          console.warn(`[HTML Fetch] Failed with status ${htmlResponse.status}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[HTML Fetch] Error: ${errorMsg} - falling back to Brave Search`);
      }
      
      // Fallback to Brave Search for additional context
      const searchClient = getSearchClient();
      let hit: SearchResult | null = null;
      
      if (searchClient.isAvailable()) {
        const searchResponse = await searchClient.search(input, [], 5);
        hit = searchResponse.results.find((h) => getBaseDomain(h.url) === inputDomain) || searchResponse.results[0];
      }
      
      // Use HTML metadata if available, otherwise use Brave Search
      if (htmlMeta) {
        articleMeta = {
          ...(htmlMeta as ArticleMeta),
          sourceType: hit ? (await fetchArticleMeta(input, hit)).sourceType : 'unknown',
        };
      } else {
        articleMeta = hit ? await fetchArticleMeta(input, hit) : { sourceType: 'unknown' as const };
      }
      
      if (hit) {
        urlContext = `URL: ${input}\nTitle: ${articleMeta.title || hit.title}\nSnippet: ${stripHtml(hit.snippet || '')}`;
      } else {
        urlContext = `URL: ${input}\nTitle: ${articleMeta.title || ''}`;
      }
    }

    const claimExtractionText = inputIsUrl ? urlContext : input.trim();

    // 2) Extract structured claims with importance and checkability
    let claims = await extractStructuredClaims(claimExtractionText, openai);
    claims = rankClaimImportance(claims, input.length);

    // Safety filter: drop meta-claims about publication/source/publisher.
    claims = claims.filter((c) => {
      const t = (c.text || '').toLowerCase();
      if (!t) return false;
      if (/(^|\b)(published by|was published by|is published by)\b/.test(t)) return false;
      if (/(^|\b)published (on|at)\b/.test(t)) return false;
      if (/(^|\b)(the article|this article|the story|this story|the report|this report)\b/.test(t) && /(published|publisher|outlet|website|domain|url|link)\b/.test(t)) return false;
      return true;
    });

    // 2.5) Detect attribution for each claim (if we have article text)
    if (fullArticleText) {
      const { detect_attribution } = await import('@/lib/attribution');
      for (const claim of claims) {
        const attribution = detect_attribution(claim.text, fullArticleText);
        if (attribution.is_attributed) {
          claim.attribution_type = attribution.attribution_type;
          claim.attribution_snippet = attribution.attribution_snippet;
        }
      }
    }

    // 3) Retrieve and score evidence for each claim
    const searchClient = getSearchClient();
    const searchEnabled = searchClient.isAvailable();
    
    for (const claim of claims) {
      const inputEvidence = inputIsUrl
        ? buildInputEvidenceForClaim({
            inputUrl: input,
            articleTitle: articleMeta.title,
            articleSnippet: articleMeta.snippet,
            fullArticleText,
            claimText: claim.text,
          })
        : null;

      // Use new search client to retrieve evidence
      const evidenceResults = await retrieve_evidence_for_claim(
        claim.text,
        inputDomain ? [inputDomain] : [],
        claim.type // Pass claim type for smarter query building
      );
      
      // Convert SearchResult to the format expected by scoreEvidence
      const sources = evidenceResults.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        age: r.age,
      }));
      
      // Score evidence for relevance and credibility (with attribution boost if present)
      const corroborationEvidence = await scoreEvidence(claim.text, sources, claim.attribution_type);
      
      // Analyze stance of each source (supports/refutes/neutral)
      const corroborationWithStance = await analyzeSourceStance(claim.text, corroborationEvidence, openai);

      claim.evidence = inputEvidence ? [inputEvidence, ...corroborationWithStance] : corroborationWithStance;
      
      // Calculate evidence summary
      // Prefer explicit domain, then derive from URL, and only then fall back to publisher label.
      const corroborationOnly = (claim.evidence || []).filter((e) => e.role !== 'INPUT');
      const uniqueDomains = new Set(
        corroborationOnly
          .map((e) => e.domain || getBaseDomain(e.url) || e.publisher)
          .filter(Boolean)
      ).size;
      const avgCredibility = corroborationOnly.length > 0
        ? corroborationOnly.reduce((sum, e) => sum + (e.credibility ?? e.credibilityScore ?? 0), 0) / corroborationOnly.length
        : 0;
      
      claim.evidenceSummary = {
        totalSources: corroborationOnly.length,
        uniqueDomains,
        supportingCount: corroborationOnly.filter(e => (e.stance ?? (e.stanceTowardsClaim === 'supports' ? 'support' : 'unclear')) === 'support').length,
        refutingCount: corroborationOnly.filter(e => (e.stance ?? (e.stanceTowardsClaim === 'refutes' ? 'refute' : 'unclear')) === 'refute').length,
        averageCredibility: avgCredibility,
      };
    }

    // 4) Analyze tactics + rebuttal.
    // IMPORTANT: manipulation/tactics analysis must NOT depend on evidence retrieval.
    const tacticsInputText = inputIsUrl
      ? (fullArticleText ? `Title: ${articleMeta.title || ''}\n\n${fullArticleText}` : urlContext)
      : input;

    // If we don't have enough text to analyze, avoid hallucinating tactics.
    // (URL context strings are often too short and lead to overconfident outputs.)
    let analysisResult: unknown = null;
    const hasEnoughTextForTactics = tacticsInputText.trim().length >= 600;

    if (hasEnoughTextForTactics) {
      const analysisResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: [
              "You are a careful, conservative language-analysis assistant.",
              "Your job is to assess wording and framing (rhetoric), NOT factual accuracy.",
              "",
              "Rules:",
              "- Be conservative: neutral, journalistic reporting should usually score low (0-30) with few/no flags.",
              "- Only include a flag if you can quote an exact short phrase from the input that supports it.",
              "- If a risky phrase appears only in an attributed quote (e.g., inside quotation marks or clearly reported speech),",
              "  do NOT treat it as the author's tactic; you may still mention it but down-weight severity.",
              "- Use calm, non-accusatory language; avoid moral judgments.",
              "- Do not refer to external sources or evidence.",
              "",
              "Task:",
              "1) Identify persuasion/manipulation tactics present in the provided text.",
              "2) Provide a calm, de-escalating rebuttal paragraph that encourages verification.",
              "",
              "Return JSON ONLY in this exact shape:",
              "{",
              "  tactics: { score_0_to_100: number, flags: string[], explanation: string },",
              "  rebuttal: { short: string, medium?: string }",
              "}",
              "",
              "In tactics.explanation, briefly justify each flag by quoting the exact phrase(s) in double quotes.",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              input: tacticsInputText,
            }),
          },
        ],
        response_format: { type: "json_object" },
      });

      analysisResult = JSON.parse(analysisResp.choices[0]?.message?.content || "{}");
    } else {
      analysisResult = {
        tactics: {
          score_0_to_100: 0,
          flags: [],
          explanation: "Not enough article text was available to assess language framing.",
        },
        rebuttal: {
          short: "Consider checking primary documents and multiple outlets before drawing conclusions.",
        },
      };
    }

    const defaultTactics: AnalysisResult['tactics'] = { score_0_to_100: 0, flags: [], explanation: "" };
    const defaultRebuttal: NonNullable<AnalysisResult['rebuttal']> = { short: "" };

    const analysisObj = isObject(analysisResult) ? analysisResult : {};
    const normalizedTactics = isTacticsShape(analysisObj.tactics) ? analysisObj.tactics : defaultTactics;
    const normalizedRebuttal = isRebuttalShape(analysisObj.rebuttal) ? analysisObj.rebuttal : defaultRebuttal;

    // 5) We keep tactics + rebuttal from the LLM, but derive claim verdicts deterministically.

    // 7) Generate smart searches for each claim based on evidence gaps
    for (const claim of claims) {
      const gaps = identifyEvidenceGaps(claim);
      claim.suggestedSearches = generateSmartSearches(claim, gaps, inputDomain || undefined);
    }

    // 8) Apply stance guardrails, recompute summaries, and set deterministic verdicts
    const retrievalStateForClaims: 'NOT_RUN' | 'RAN_NO_RESULTS' | 'RAN_WITH_RESULTS' =
      !searchEnabled
        ? 'NOT_RUN'
        : claims.some((c) => (c.evidence || []).some((e) => e.role !== 'INPUT'))
          ? 'RAN_WITH_RESULTS'
          : 'RAN_NO_RESULTS';

    for (const claim of claims) {
      const inputEvidence = (claim.evidence || []).filter((e) => e.role === 'INPUT');
      const corroborationEvidence = (claim.evidence || []).filter((e) => e.role !== 'INPUT');

      const guardedCorroboration = applyStanceGuardrails(claim.text, claim.type, corroborationEvidence);
      claim.evidence = [...inputEvidence, ...guardedCorroboration];

      const corroborationOnly = (claim.evidence || []).filter((e) => e.role !== 'INPUT');
      const uniqueDomains = new Set(
        corroborationOnly
          .map((e) => e.domain || getBaseDomain(e.url) || e.publisher)
          .filter(Boolean)
      ).size;
      const avgCredibility = corroborationOnly.length > 0
        ? corroborationOnly.reduce((sum, e) => sum + (e.credibility ?? 0), 0) / corroborationOnly.length
        : 0;

      claim.evidenceSummary = {
        totalSources: corroborationOnly.length,
        uniqueDomains,
        supportingCount: corroborationOnly.filter((e) => e.stance === 'support').length,
        refutingCount: corroborationOnly.filter((e) => e.stance === 'refute').length,
        averageCredibility: avgCredibility,
      };

      const derived = deriveDeterministicVerdict(claim, retrievalStateForClaims);
      claim.verdict = derived.verdict;
      claim.verdictConfidence = derived.verdictConfidence;
      claim.reasoning = derived.reasoning;
    }

    // 9) Build response with new structure
    const overall_score = calculateOverallVerifiability(claims, searchEnabled);
    
    const response: AnalysisResult = {
      article_meta: articleMeta,
      claims: claims.map(c => ({
        text: c.text,
        type: c.type,
        importance: c.importance,
        checkability: c.checkability,
        evidence: c.evidence.map(e => ({
          role: e.role,
          url: e.url,
          title: e.title,
          publisher: e.publisher,
          domain: e.domain,
          published_at: e.published_at,
          snippet: stripHtml(e.snippet || ''),
          stance: e.stance,
          credibility: e.credibility,
          supports_claim: e.supports_claim,
          confidence: e.confidence,
          // Legacy fields
          age: e.age,
          relevanceScore: e.relevanceScore,
          credibilityScore: e.credibilityScore,
          stanceTowardsClaim: e.stanceTowardsClaim,
          keyQuote: e.keyQuote,
        })),
        verdict: c.verdict,
        verdictConfidence: c.verdictConfidence,
        reasoning: c.reasoning,
        evidenceSummary: c.evidenceSummary,
        suggestedSearches: c.suggestedSearches,
      })),
      overall_score,
      overallVerifiability: overall_score, // Legacy field for backward compatibility
      tactics: normalizedTactics,
      rebuttal: normalizedRebuttal,
      debug: {
        input_domain: inputDomain || null,
        brave_key_present: !!process.env.BRAVE_SEARCH_API_KEY,
        input_is_url: inputIsUrl,
        claim_checkability: claims.map((c) => {
          const analyzed = analyzeCheckability(c.text, c.type);
          return {
            text: c.text,
            type: c.type,
            checkability: c.checkability,
            baseline: analyzed.features.baseline,
            features: analyzed.features,
          };
        }),
      },
    };

    // Calculate cost and record usage
    const processingTime = Date.now() - startTime;
    const costEstimate = calculateAnalysisCost(response);
    const totalEvidence = response.claims.reduce((sum, c) => sum + c.evidence.length, 0);
    
    console.log(`[Metering] Analysis complete - Cost: $${costEstimate.toFixed(3)}, Time: ${processingTime}ms`);
    
    // Record usage event
    await recordUsage(effectiveUserId, userTier, 'fact_check', {
      inputType,
      inputHash,
      costEstimate,
      apisCalled: searchEnabled ? ['brave-search', 'openai'] : ['openai'],
      claimsExtracted: response.claims.length,
      evidenceRetrieved: totalEvidence,
      usedCache: false,
      processingTimeMs: processingTime,
    });
    
    // Cache the result for future requests
    await cacheAnalysis(inputHash, inputType, input, response, costEstimate);
    console.log(`[Metering] Result cached with hash: ${inputHash.substring(0, 12)}...`);
    
    // Add metering metadata to response
    const quotaAfter = await checkQuota(effectiveUserId, userTier, 'fact_check');
    
    return Response.json({
      ...response,
      _meta: {
        cached: false,
        cost: costEstimate,
        processing_time_ms: processingTime,
        remaining_checks: quotaAfter.remaining,
      }
    });
  } catch (err: unknown) {
    console.error("ANALYZE ERROR:", err);
    const details = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Server error", details },
      { status: 500 }
    );
  }
}
