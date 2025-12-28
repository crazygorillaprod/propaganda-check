export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasBrave: !!process.env.BRAVE_SEARCH_API_KEY,
  });
}
