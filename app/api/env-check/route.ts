export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    openAiPrefix: (process.env.OPENAI_API_KEY || "").slice(0, 3),
  });
}
