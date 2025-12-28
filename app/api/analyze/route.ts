import OpenAI from "openai";

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

    // If user pasted a URL, we do a first search on it to get a title/snippet context.
    let urlContext = "";
    if (inputIsUrl) {
      const { results: firstHits } = await braveSearch(input.trim(), []);
      const hit = firstHits.find((h) => getBaseDomain(h.url) === inputDomain) || firstHits[0];
      if (hit) {
        urlContext = `URL: ${input.trim()}\nTitle: ${hit.title}\nSnippet: ${hit.snippet}`;
      } else {
        urlContext = `URL: ${input.trim()}`;
      }
    }

    const claimExtractionText = inputIsUrl ? urlContext : input.trim();

    // 1) Extract checkable claims
    const claimsResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract 3-6 checkable factual claims from the text. Return JSON ONLY: { claims: string[] }",
        },
        { role: "user", content: claimExtractionText },
      ],
      response_format: { type: "json_object" },
    });

    const claimsJson = JSON.parse(claimsResp.choices[0]?.message?.content || "{}");
    const claims: string[] = Array.isArray(claimsJson.claims)
      ? claimsJson.claims.map((c: any) => String(c)).slice(0, 6)
      : [];

    // 2) Retrieve evidence for each claim, excluding the original domain if input was a URL
    const bundles = await Promise.all(
      claims.map(async (claim) => {
        const { results: sources } = await braveSearch(claim, inputDomain ? [inputDomain] : []);
        // Keep max 6 raw; later we dedupe for citations
        return { claim, sources: sources.slice(0, 6) };
      })
    );

    // 3) Analyze tactics + verdicts based ONLY on provided sources
    const analysisResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "You are an evidence-first misinformation assistant.",
            "Rules:",
            "1) Identify persuasion/manipulation tactics in the input (separate from factual accuracy).",
            "2) For each claim, judge ONLY using the provided sources for that claim.",
            "3) If sources are missing/weak/irrelevant OR fewer than 2 independent domains, verdict MUST be 'Insufficient evidence'.",
            "4) Do NOT cite category/tag/hub pages, homepages, or privacy/terms pages.",
            "5) Use calm empowering language. No insults.",
            "",
            "Return JSON ONLY in this exact shape:",
            "{",
            "  tactics: { score_0_to_100: number, flags: string[], explanation: string },",
            "  claims: Array<{",
            "    claim: string,",
            "    verdict: 'Supported'|'Mixed'|'Not supported'|'Insufficient evidence',",
            "    reasoning: string",
            "  }>,",
            "  rebuttal: { short: string, medium?: string },",
            "  research_guidance: { verifiability_0_to_100: number, suggested_searches: string[] }",
            "}",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            input: inputIsUrl ? urlContext : input,
            bundles: bundles.map((b) => ({
              claim: b.claim,
              sources: b.sources.map((s) => ({
                title: s.title,
                url: s.url,
                snippet: s.snippet,
                age: s.age,
              })),
            })),
          }),
        },
      ],
      response_format: { type: "json_object" },
    });

    const out = JSON.parse(analysisResp.choices[0]?.message?.content || "{}");

    // 4) Attach cleaned citations per claim and enforce 2-domain minimum
    const shapedClaims = (Array.isArray(out?.claims) ? out.claims : []).map((c: any) => {
      const bundle = bundles.find((b) => b.claim === c.claim);
      const rawSources = bundle?.sources ?? [];
      const citations = dedupeByDomain(rawSources, 4);
      const uniqueDomains = countUniqueDomains(citations);

      let verdict = c?.verdict;
      if (!citations.length || uniqueDomains < 2) {
        verdict = "Insufficient evidence";
      }

      return {
        claim: c?.claim || bundle?.claim || "",
        verdict,
        reasoning: String(c?.reasoning || ""),
        citations: citations.map((s) => ({ title: s.title, url: s.url })),
        domain_count: uniqueDomains,
      };
    });

    const suggestedSearches: string[] = [];
    const base = inputIsUrl ? claimExtractionText : input.trim();
    if (inputIsUrl && base) {
      suggestedSearches.push(base.split("\n")[1]?.replace(/^Title:\s*/, "") || "Fact check this article");
    }
    for (const cl of claims.slice(0, 3)) {
      suggestedSearches.push(`${cl} fact check`);
      if (inputDomain) suggestedSearches.push(`${cl} -site:${inputDomain}`);
      suggestedSearches.push(`site:.gov ${cl}`);
    }

    const response = {
      tactics: out?.tactics ?? { score_0_to_100: 0, flags: [], explanation: "" },
      claims: shapedClaims,
      rebuttal: out?.rebuttal ?? { short: "" },
      research_guidance: out?.research_guidance ?? {
        verifiability_0_to_100: 70,
        suggested_searches: suggestedSearches.slice(0, 8),
      },
      meta: {
        input_is_url: inputIsUrl,
        excluded_domain: inputDomain || null,
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
