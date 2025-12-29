import { generateTeachingTake, prepareTeachingTakeInput } from '@/lib/teaching-take';
import type { AnalysisResult } from '@/lib/types';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisResult, topic } = body as {
      analysisResult: AnalysisResult;
      topic?: string;
    };

    if (!analysisResult) {
      return Response.json(
        { error: 'Missing analysisResult' },
        { status: 400 }
      );
    }

    // Generate teaching take (uses placeholder for now, can integrate LLM later)
    const teachingTake = await generateTeachingTake(analysisResult, topic);

    return Response.json(teachingTake);
  } catch (err) {
    console.error('Teaching take generation error:', err);
    return Response.json(
      {
        error: 'Failed to generate teaching take',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
