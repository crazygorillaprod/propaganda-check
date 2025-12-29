import { generateTeachingTake } from '@/lib/teaching-take-v2';
import type { AnalysisResult } from '@/lib/types';
import type { WritingMode } from '@/lib/writing-profile';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisResult, topic, mode } = body as {
      analysisResult: AnalysisResult;
      topic?: string;
      mode?: WritingMode;
    };

    if (!analysisResult) {
      return Response.json(
        { error: 'Missing analysisResult' },
        { status: 400 }
      );
    }

    // Default to Public Mode (6th grade, action-oriented)
    const writingMode: WritingMode = mode || 'public';

    // Generate teaching take (uses placeholder for now, can integrate LLM later)
    const teachingTake = await generateTeachingTake(analysisResult, topic, writingMode);

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
