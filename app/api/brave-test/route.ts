export const runtime = "nodejs";

type BraveWeb = {
  web?: {
    results?: Array<{ title?: string; url?: string; description?: string }>;
  };
};

export async function GET(req: Request) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return Response.json({ ok: false, error: "BRAVE_SEARCH_API_KEY not set" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "Lillian Bonsignore FDNY commissioner experience";

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", "8");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });

  const raw = await res.text();

  let json: BraveWeb | null = null;
  try { json = JSON.parse(raw) as BraveWeb; } catch {}

  const results = json?.web?.results ?? [];
  const topUrls = results
    .map(r => r.url)
    .filter(Boolean)
    .slice(0, 6);

  return Response.json({
    ok: res.ok,
    status: res.status,
    usedQuery: q,
    count: results.length,
    topUrls,
    rawPreview: raw.slice(0, 220),
  });
}
