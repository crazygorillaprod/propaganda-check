import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveTier, getUserByEmail, upsertUserByEmail } from '@/lib/user-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ tier: 'free' }, { status: 200 });
  }

  const normalized = email.trim().toLowerCase();

  // Ensure record exists for callers that have only done email-capture.
  if (!getUserByEmail(normalized)) {
    upsertUserByEmail(normalized, { tier: 'free', verified: false });
  }

  const user = getUserByEmail(normalized);
  const tier = getEffectiveTier(normalized);

  return NextResponse.json({
    email: normalized,
    verified: user?.verified ?? false,
    tier,
  });
}
