import { getUsageSummary, type UsageTier } from '@/lib/metering';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const tier = (searchParams.get('tier') as UsageTier) || 'free';

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    const summary = await getUsageSummary(userId, tier);

    return Response.json(summary);
  } catch (err) {
    console.error('Usage endpoint error:', err);
    return Response.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
