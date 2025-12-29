import { NextRequest, NextResponse } from 'next/server';
import type { UsageTier } from '@/lib/types';
import { setUserTier, upsertUserByEmail, getUserByEmail } from '@/lib/user-store';

export const runtime = 'nodejs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const action = (body?.action ?? 'setTier').toString();
  const email = (body?.email ?? '').toString().trim().toLowerCase();

  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  if (action === 'setTier') {
    const tier = body?.tier as UsageTier;
    if (tier !== 'free' && tier !== 'pro' && tier !== 'creator' && tier !== 'organization') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const user = tier === 'free'
      ? upsertUserByEmail(email, { tier: 'free', verified: true })
      : setUserTier(email, tier);

    return NextResponse.json({ success: true, user });
  }

  if (action === 'markVerified') {
    const user = upsertUserByEmail(email, { verified: true });
    return NextResponse.json({ success: true, user });
  }

  if (action === 'get') {
    const user = getUserByEmail(email);
    return NextResponse.json({ success: true, user });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
