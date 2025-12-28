import OpenAI from "openai";
import { Claim, AnalysisResult } from "@/lib/types";
import { fetchArticleMeta } from "@/lib/article-meta";
import { extractStructuredClaims, rankClaimImportance } from "@/lib/claims";
import { scoreEvidence, analyzeSourceStance } from "@/lib/evidence";
import {
  calculateOverallVerifiability,
  identifyEvidenceGaps,
  generateSmartSearches,
} from "@/lib/verifiability";

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

function isUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length < 8) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const inputIsUrl = isUrl(input.trim());
    const inputDomain = inputIsUrl ? getBaseDomain(input.trim()) : "";

    // 1) Fetch article metadata for URLs
    let articleMeta: any = { sourceType: 'unknown' as const };
    let urlContext = "";
    
    if (inputIsUrl) {
      const { results: firstHits } = await braveSearch(input.trim(), []);
      const hit = firstHits.find((h) => getBaseDomain(h.url) === inputDomain) || firstHits[0];
      
      articleMeta = await fetchArticleMeta(input.trim(), hit);
      
      if (hit) {
        urlContext = `URL: ${input.trim()}\nTitle: ${hit.title}\nSnippet: ${hit.snippet}`;
      } else {
        urlContext = `URL: ${input.trim()}`;
      }
    }

    const claimExtractionText = inputIsUrl ? urlContext : input.trim();

    // 2) Extract structured claims with importance and checkability
    let claims = await extractStructuredClaims(claimExtractionText, openai);
    claims = rankClaimImportance(claims, input.length);

    // 3) Retrieve and score evidence for each claim
    for (const claim of claims) {
      const { usedQuery, results: sources } = await braveSearch(
        claim.text,
        inputDomain ? [inputDomain] : []
      );
      
      // Score evidence for relevance and credibility
      claim.evidence = await scoreEvidence(claim.text, sources.slice(0, 6));
      
      // Analyze stance of each source (supports/refutes/neutral)
      claim.evidence = await analyzeSourceStance(claim.text, claim.evidence, openai);
      
      // Calculate evidence summary
      const uniqueDomains = new Set(claim.evidence.map(e => e.domain || e.publisher)).size;
      const avgCredibility = claim.evidence.length > 0
        ? claim.evidence.reduce((sum, e) => sum + (e.credibilityScore || 0), 0) / claim.evidence.length
        : 0;
      
      claim.evidenceSummary = {
        totalSources: claim.evidence.length,
        uniqueDomains,
        supportingCount: claim.evidence.filter(e => e.stanceTowardsClaim === 'supports').length,
        refutingCount: claim.evidence.filter(e => e.stanceTowardsClaim === 'refutes').length,
        averageCredibility: avgCredibility,
      };
    }

    // 4) Analyze tactics + verdicts based on evidence
    const analysisResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "You are an evidence-first misinformation assistant.",
            "Rules:",
            "1) Identify persuasion/manipulation tactics in the input (separate from factual accuracy).",
            "2) For each claim, judge using the provided evidence and stance analysis.",
            "3) Consider evidence credibility and relevance scores.",
            "4) Use calm empowering language. No insults.",
            "",
            "Return JSON ONLY in this exact shape:",
            "{",
            "  tactics: { score_0_to_100: number, flags: string[], explanation: string },",
            "  claims: Array<{",
            "    claim: string,",
            "    verdict: 'Supported'|'Mixed'|'Not supported'|'Insufficient evidence',",
            "    confidence: number (0-1),",
            "    reasoning: string",
            "  }>,",
            "  rebuttal: { short: string, medium?: string }",
            "}",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            input: inputIsUrl ? urlContext : input,
            claims: claims.map((c) => ({
              text: c.text,
              type: c.type,
              checkability: c.checkability,
              evidence: c.evidence.map((e) => ({
                title: e.title,
                url: e.url,
                snippet: e.snippet,
                credibilityScore: e.credibilityScore,
                relevanceScore: e.relevanceScore,
                stance: e.stanceTowardsClaim,
                keyQuote: e.keyQuote,
              })),
              evidenceSummary: c.evidenceSummary,
            })),
          }),
        },
      ],
      response_format: { type: "json_object" },
    });

    const analysisResult = JSON.parse(analysisResp.choices[0]?.message?.content || "{}");

    // 5) Update claims with verdicts and reasoning
    for (let i = 0; i < claims.length; i++) {
      const analysisClaim = analysisResult.claims?.[i];
      if (analysisClaim) {
        claims[i].verdict = analysisClaim.verdict || 'Insufficient evidence';
        claims[i].verdictConfidence = analysisClaim.confidence || 0;
        claims[i].reasoning = analysisClaim.reasoning || '';
        
        // Override to "Insufficient evidence" if not enough unique domains
        if (claims[i].evidenceSummary.uniqueDomains < 2) {
          claims[i].verdict = 'Insufficient evidence';
        }
      }
    }

    // 6) Calculate overall verifiability
    const overallVerifiability = calculateOverallVerifiability(claims);

    // 7) Generate smart searches for each claim based on evidence gaps
    for (const claim of claims) {
      const gaps = identifyEvidenceGaps(claim);
      claim.suggestedSearches = generateSmartSearches(claim, gaps, inputDomain || undefined);
    }

    // 8) Build response with new structure
    const overall_score = calculateOverallVerifiability(claims);
    
    const response: AnalysisResult = {
      article_meta: articleMeta,
      claims: claims.map(c => ({
        text: c.text,
        type: c.type,
        importance: c.importance,
        checkability: c.checkability,
        evidence: c.evidence.map(e => ({
          url: e.url,
          title: e.title,
          publisher: e.publisher,
          published_at: e.published_at,
          snippet: e.snippet,
          supports_claim: e.supports_claim,
          confidence: e.confidence,
          // Legacy fields
          domain: e.domain,
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
      tactics: analysisResult?.tactics ?? { score_0_to_100: 0, flags: [], explanation: "" },
      rebuttal: analysisResult?.rebuttal ?? { short: "" },
      debug: {
        input_domain: inputDomain || null,
        brave_key_present: !!process.env.BRAVE_SEARCH_API_KEY,
        input_is_url: inputIsUrl,
      },
    };

    return Response.json(response);
  } catch (err: any) {
    console.error("ANALYZE ERROR:", err);
    return Response.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
