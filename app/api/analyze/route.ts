import OpenAI from "openai";

export const runtime = "nodejs";

// Basic HTML text extractor (small and permissive—used server-side only)
function extractTitle(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function stripTags(html: string) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html: string, baseUrl?: string) {
  const links: string[] = [];
  const re = /<a[^>]+href=["']?([^"' >]+)["']?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const raw = m[1];
      const url = new URL(raw, baseUrl).toString();
      links.push(url);
    } catch (e) {
      // ignore
    }
  }
  return Array.from(new Set(links)).slice(0, 10); // limit
}

// Brave Search helper
async function braveSearch(query: string, size = 5) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key || !query) return [];

  const base = process.env.BRAVE_SEARCH_API_URL ?? "https://api.search.brave.com/res/v1";
  const url = new URL(base);
  url.searchParams.set("q", query);
  url.searchParams.set("size", String(size));

  // Try with Authorization header; if the service expects x-api-key adaptively handle failures
  const headers = { Accept: "application/json", Authorization: `Bearer ${key}` };

  try {
    let r = await fetch(url.toString(), { headers });
    if (r.status === 401 || r.status === 403) {
      // try x-api-key header as fallback
      r = await fetch(url.toString(), { headers: { Accept: "application/json", "x-api-key": key } });
    }
    if (!r.ok) return [];

    const js = await r.json();

    // Heuristic mapping for common keys
    const items = js.items || js.results || js.data || [];
    const out = (items || []).slice(0, size).map((it: any) => {
      return {
        title: it.title || it.name || it.heading || undefined,
        url: it.url || it.link || it.l || it.href || it.canonicalUrl || undefined,
        snippet: it.snippet || it.description || it.snippetText || undefined,
      };
    }).filter((s: any) => s.url);

    return out;
  } catch (e) {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Missing input" }), { status: 400, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
    }

    // Optional: mock behavior if configured to avoid calling OpenAI while debugging
    const MOCK = process.env.MOCK_ANALYZE === "1";

    // If input looks like a URL, fetch page content
    let page = null as null | { url: string; title: string; text: string; links: string[] };
    try {
      const asUrl = new URL(input);
      const r = await fetch(asUrl.toString(), { headers: { "User-Agent": "propaganda-check/1.0 (+https://example)" }, timeout: 10000 });
      const html = await r.text();
      page = {
        url: asUrl.toString(),
        title: extractTitle(html),
        text: stripTags(html).slice(0, 60_000), // cap size
        links: extractLinks(html, asUrl.toString()),
      };
    } catch (e) {
      // Not a URL or fetch failed — we'll treat input as raw text
    }

    // Build user prompt: include page content if available
    const contentForModel = page
      ? `URL: ${page.url}\nTitle: ${page.title}\n\nPage text (first 60k chars):\n${page.text}`
      : input;

    // If mock mode, return a deterministic mock result
    if (MOCK) {
      const mockPayload = {
        tactics: {
          score_0_to_100: 75,
          flags: ["emotional appeal", "vagueness"],
          explanation: "The content relies on emotional wording and lacks citations.",
        },
        rebuttal: { short: "Seek primary sources and data; avoid emotional conclusions without evidence." },
        verifiability_score: 40,
        sources: page ? page.links.slice(0, 5).map((u) => ({ url: u })) : [],
        research_needed: true,
      };
      return new Response(JSON.stringify(mockPayload), { status: 200, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Longer structured instruction requesting verifiability_score (0-100, higher = MORE verifiable)
    const systemPrompt = `You are an assistant that analyzes text for propaganda, manipulation, and verifiability. Respond with valid JSON only. The JSON object must contain: \n- tactics: { score_0_to_100: number (0-100, higher means more verifiable / less manipulative), flags: string[], explanation: string }\n- rebuttal: { short: string }\n- verifiability_score: number (0-100 where 100 is fully verifiable)\n- sources: array of { url?: string, title?: string, snippet?: string } (include citations or page links if present)\n- research_needed: boolean (true if verifiability_score < 90)\nOnly output JSON. Do NOT include any keys that contain secrets or API keys. Use the provided page content when available to identify claims and supporting references. If you find explicit references (names, datasets, numbers), include them in explanation and add probable source URLs or the page's links. Keep values concise.`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentForModel },
      ],
      response_format: { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content ?? "{}";

    let data: any = {};
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Invalid model response", details: e?.message ?? String(e) }), { status: 502, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
    }

    // Augment sources with Brave Search results when possible
    let externalSources: Array<{ url?: string; title?: string; snippet?: string }> = [];
    try {
      const primaryQuery = page ? (page.title || page.text.slice(0, 200)) : input.slice(0, 200);
      const results = await braveSearch(primaryQuery, 5);
      externalSources = results.map((r: any) => ({ url: r.url, title: r.title, snippet: r.snippet }));
    } catch (e) {
      externalSources = [];
    }

    // Merge model-provided sources, page links, and external sources; dedupe by URL
    const modelSources = Array.isArray(data.sources) ? data.sources : [];
    const pageSources = page ? page.links.map((u) => ({ url: u })) : [];

    const all = [...modelSources, ...pageSources, ...externalSources];
    const seen = new Set<string>();
    const merged: Array<{ url?: string; title?: string; snippet?: string }> = [];
    for (const s of all) {
      if (!s?.url) continue;
      const u = String(s.url);
      if (seen.has(u)) continue;
      seen.add(u);
      merged.push({ url: u, title: s.title, snippet: s.snippet });
      if (merged.length >= 10) break;
    }

    // Normalize response
    const out = {
      tactics: {
        score_0_to_100: typeof data.tactics?.score_0_to_100 === "number" ? data.tactics.score_0_to_100 : (100 - (data.verifiability_score ?? 0)),
        flags: Array.isArray(data.tactics?.flags) ? data.tactics.flags : (Array.isArray(data.flags) ? data.flags : []),
        explanation: typeof data.tactics?.explanation === "string" ? data.tactics.explanation : (typeof data.explanation === "string" ? data.explanation : ""),
      },
      rebuttal: { short: data.rebuttal?.short ?? "" },
      verifiability_score: typeof data.verifiability_score === "number" ? data.verifiability_score : 0,
      sources: merged,
      research_needed: typeof data.research_needed === "boolean" ? data.research_needed : ( (typeof data.verifiability_score === 'number') ? data.verifiability_score < 90 : true ),
    };

    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Server error", details: err?.message || String(err) }), { status: 500, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
  }
}
