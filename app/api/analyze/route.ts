import OpenAI from "openai";

export const runtime = "nodejs";

/**
 * POST /api/analyze
 * Body: { input: string }
 * Returns a normalized JSON object with tactics and rebuttal.
 * Note: This endpoint never returns secret API keys; it requires
 * the `OPENAI_API_KEY` environment variable to be set on the server.
 */
export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    if (!input || typeof input !== "string" || input.trim().length < 10) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Analyze propaganda/persuasion tactics in the text. Return JSON only: { score_0_to_100:number, flags:string[], explanation:string, rebuttal:{short:string} }",
        },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content ?? "{}";

    let data: any = {};
    try {
      // The SDK may already parse it; support both string and object
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e: any) {
      return Response.json({ error: "Invalid model response", details: e?.message ?? String(e) }, { status: 502 });
    }

    return Response.json({
      tactics: {
        score_0_to_100: (typeof data.score_0_to_100 === "number" ? data.score_0_to_100 : 0),
        flags: Array.isArray(data.flags) ? data.flags : [],
        explanation: typeof data.explanation === "string" ? data.explanation : "",
      },
      rebuttal: { short: (data.rebuttal?.short ?? "") },
    });
  } catch (err: any) {
    return Response.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
