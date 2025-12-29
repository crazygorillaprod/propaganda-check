import { NextRequest, NextResponse } from 'next/server';
import { clearExpiredCache, invalidateCache } from '@/lib/cache';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = (body?.action ?? '').toString();

  if (action === 'clearExpired') {
    const cleared = clearExpiredCache();
    return NextResponse.json({ success: true, cleared });
  }

  if (action === 'invalidate') {
    const inputHash = (body?.inputHash ?? '').toString();
    if (!inputHash) {
      return NextResponse.json({ error: 'inputHash required' }, { status: 400 });
    }
    const ok = invalidateCache(inputHash);
    return NextResponse.json({ success: true, deleted: ok });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
