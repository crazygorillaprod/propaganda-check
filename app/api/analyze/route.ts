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

function isBadCitation(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.toLowerCase();

    // junk / nav pages
    if (path === "/" || path.length < 2) return true;
    if (path.includes("/terms")) return true;
    if (path.includes("/privacy")) return true;
    if (path.includes("/about")) return true;

    // AP hub/category pages
    if (host.endsWith("apnews.com") && path.startsWith("/hub/")) return true;

    // shallow category pages like /politics or /world
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return true;

    return false;
  } catch {
    return true;
  }
}

// Simple heuristic classifier (fallback when OpenAI isn't available)
function heuristicClassify(claim: string, text: string) {
  const low = (s: string) => s.toLowerCase();
  const t = low(text || "");
  const c = low(claim || "");
  if (/no evidence|debunk|false|not true|denies|contradict/.test(t)) return { stance: "refutes", confidence: 70 };
  if (/study|research|data|report|evidence|found that|statistics|according to/.test(t)) return { stance: "supports", confidence: 60 };
  // if the text repeats the claim, assume neutral-supporting
  const claimWords = c.split(/\W+/).filter(Boolean).slice(0, 10).join(" ");
  if (claimWords && t.includes(claimWords.split(" ")[0])) return { stance: "neutral", confidence: 50 };
  return { stance: "neutral", confidence: 40 };
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const r = await fetch(asUrl.toString(), { headers: { "User-Agent": "propaganda-check/1.0 (+https://example)" }, signal: controller.signal });
      clearTimeout(timeoutId);
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
      model: "gpt-4o-mini",
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
    let externalSources: Array<{ url?: string; title?: string; snippet?: string; origin?: string }> = [];
    try {
      const primaryQuery = page ? (page.title || page.text.slice(0, 200)) : input.slice(0, 200);
      const results = await braveSearch(primaryQuery, 5);
      externalSources = results.map((r: any) => ({ url: r.url, title: r.title, snippet: r.snippet, origin: 'brave' }));
    } catch (e) {
      externalSources = [];
    }

    // Merge model-provided sources, page links, and external sources; dedupe by URL
    const modelSources = Array.isArray(data.sources) ? data.sources.map((s: any) => ({ url: s.url, title: s.title, snippet: s.snippet, origin: 'model' })) : [];
    const pageSources = page ? page.links.map((u) => ({ url: u, title: undefined, snippet: undefined, origin: 'page' })) : [];

    const all = [...modelSources, ...pageSources, ...externalSources];
    const seen = new Set<string>();
    const merged: Array<{ url?: string; title?: string; snippet?: string; origin?: string }> = [];
    for (const s of all) {
      if (!s?.url) continue;
      const u = String(s.url);
      if (seen.has(u)) continue;
      seen.add(u);
      merged.push({ url: u, title: s.title, snippet: s.snippet, origin: s.origin });
      if (merged.length >= 10) break;
    }

    // If sources are sparse, try to fetch brief snippets for brave results
    async function fetchSnippet(url: string) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(url, { headers: { "User-Agent": "propaganda-check/1.0 (+https://example)" }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!r.ok) return undefined;
        const html = await r.text();
        const text = stripTags(html).slice(0, 800);
        // return a short snippet (first sentence-ish)
        const m = text.match(/(.{120,300}?\.|$)/);
        return m ? m[0].trim() : text.slice(0, 200);
      } catch (e) {
        return undefined;
      }
    }

    // Filter noisy links from merged set (drop site roots, /privacy, /terms, etc.)
    const filtered = merged.filter((s) => s && s.url && !isBadCitation(s.url)).slice(0, 10);

    // If there are no model/page sources, enrich brave sources with fetched snippets (but operate on filtered list)
    if ((!filtered || filtered.length === 0) && externalSources && externalSources.length > 0) {
      for (let i = 0; i < Math.min(3, externalSources.length); i++) {
        const s = externalSources[i];
        if (s && !s.snippet && s.url && !isBadCitation(s.url)) {
          const sn = await fetchSnippet(s.url);
          const idx = filtered.findIndex((x) => x.url === s.url);
          if (idx >= 0 && sn) filtered[idx].snippet = sn;
        }
      }
    }

    // Build suggested search queries to help research
    const queryBase = page ? (page.title || page.text.slice(0, 200)) : input.slice(0, 200);
    const suggested_searches = [
      `${queryBase}`,
      `${queryBase} fact check`,
      `site:.gov ${queryBase}`,
      `${queryBase} data`,
    ].slice(0, 4);

    // Classify top sources (up to 5) with OpenAI or heuristic fallback
    const classifyLimit = Math.min(5, filtered.length);
    const classified: Array<{ url?: string; title?: string; snippet?: string; origin?: string; stance?: string; confidence?: number }> = [];

    for (let i = 0; i < classifyLimit; i++) {
      const s = filtered[i];
      if (!s || !s.url) continue;
      let stance = 'unknown';
      let confidence = 0;

      // Try model-based classification if we have an API key
      if (process.env.OPENAI_API_KEY && !process.env.MOCK_ANALYZE) {
        try {
          const prompt = `Classify whether the following source (title/snippet) would SUPPORT, REFUTE, or be NEUTRAL regarding the CLAIM.\n\nCLAIM: ${input}\n\nSOURCE TITLE: ${s.title || ''}\nSOURCE SNIPPET: ${s.snippet || ''}\n\nReturn JSON only: { "stance": "supports|refutes|neutral", "confidence": number between 0-100 }
`;
          const r = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'You are a concise classifier.' }, { role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          });
          const rawc = r.choices?.[0]?.message?.content ?? '{}';
          const parsed = typeof rawc === 'string' ? JSON.parse(rawc) : rawc;
          stance = parsed.stance || 'unknown';
          confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
          // Normalize confidence: if value is between 0-1, convert to 0-100
          if (confidence > 0 && confidence < 1) confidence = Math.round(confidence * 100);
        } catch (e) {
          const h = heuristicClassify(input, s.snippet || s.title || '');
          stance = h.stance; confidence = h.confidence;
        }
      } else {
        // Heuristic fallback
        const h = heuristicClassify(input, s.snippet || s.title || '');
        stance = h.stance; confidence = h.confidence;
      }

      classified.push({ url: s.url, title: s.title, snippet: s.snippet, origin: s.origin, stance, confidence });
    }

    // Append any remaining filtered sources without classification
    for (let i = classifyLimit; i < filtered.length; i++) {
      const s = filtered[i];
      if (!s) continue;
      classified.push({ url: s.url, title: s.title, snippet: s.snippet, origin: s.origin, stance: 'unknown', confidence: 0 });
    }

    // Normalize response
    const out: any = {
      tactics: {
        score_0_to_100: typeof data.tactics?.score_0_to_100 === "number" ? data.tactics.score_0_to_100 : (100 - (data.verifiability_score ?? 0)),
        flags: Array.isArray(data.tactics?.flags) ? data.tactics.flags : (Array.isArray(data.flags) ? data.flags : []),
        explanation: typeof data.tactics?.explanation === "string" ? data.tactics.explanation : (typeof data.explanation === "string" ? data.explanation : ""),
      },
      rebuttal: { short: data.rebuttal?.short ?? "" },
      verifiability_score: typeof data.verifiability_score === "number" ? data.verifiability_score : 0,
      sources: classified,
      suggested_searches,
      research_needed: typeof data.research_needed === "boolean" ? data.research_needed : ( (typeof data.verifiability_score === 'number') ? data.verifiability_score < 90 : true ),
    };

    // --- Redaction: remove or rewrite any sensitive content before returning ---
    const redactions: Array<{ field: string; reason: string }> = [];

    async function checkSensitiveText(text: string) {
      if (!text) return { sensitive: false, reasons: [] };
      // Short-circuit if mocking
      if (process.env.MOCK_ANALYZE === '1') return { sensitive: false, reasons: [] };

      // Try OpenAI moderation if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          // The SDK supports a moderation endpoint; use 'omni-moderation-latest' if available
          const mod = await (client as any).moderations.create({ model: 'text-moderation-latest', input: text.slice(0, 2000) });
          const res = mod?.results?.[0];
          if (res) {
            // If any category flagged as true, treat as sensitive
            const categories = Object.keys(res.categories || {}).filter((k) => (res.categories as any)[k]);
            if (categories.length) return { sensitive: true, reasons: categories };
          }
        } catch (e) {
          // swallow and fall back to heuristics
        }
      }

      // Heuristic checks (violent language, doxxing patterns)
      const reasons: string[] = [];
      const t = text.toLowerCase();
      if (/\b(kill|murder|assassinat|bomb|explode|poison|terrorist|rape|lynch)\b/.test(t)) reasons.push('violence');
      if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) reasons.push('personal_data');
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) reasons.push('personal_data');
      if (/\b\d{7,}\b/.test(text)) reasons.push('phone_or_id');

      return { sensitive: reasons.length > 0, reasons };
    }

    // Check and redact fields
    // tactics.explanation
    const check1 = await checkSensitiveText(out.tactics.explanation);
    if (check1.sensitive) {
      redactions.push({ field: 'tactics.explanation', reason: check1.reasons.join(',') });
      out.tactics.explanation = '[REDACTED: content removed for safety]';
    }

    // rebuttal.short
    const check2 = await checkSensitiveText(out.rebuttal.short);
    if (check2.sensitive) {
      redactions.push({ field: 'rebuttal.short', reason: check2.reasons.join(',') });
      out.rebuttal.short = '[REDACTED: content removed for safety]';
    }

    // sources snippets/titles
    for (let i = 0; i < out.sources.length; i++) {
      const s = out.sources[i];
      if (s?.snippet) {
        const cs = await checkSensitiveText(s.snippet);
        if (cs.sensitive) {
          redactions.push({ field: `sources[${i}].snippet`, reason: cs.reasons.join(',') });
          s.snippet = '[REDACTED: content removed for safety]';
        }
      }
      if (s?.title) {
        const ct = await checkSensitiveText(s.title);
        if (ct.sensitive) {
          redactions.push({ field: `sources[${i}].title`, reason: ct.reasons.join(',') });
          s.title = '[REDACTED: content removed for safety]';
        }
      }
    }

    if (redactions.length) out.redactions = redactions;

    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Server error", details: err?.message || String(err) }), { status: 500, headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex, nofollow" } });
  }
}
