import { NextRequest, NextResponse } from 'next/server';
import { getAdminCookieName, mintAdminToken } from '@/lib/admin-token';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not set' }, { status: 500 });
    }

    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    if (password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await mintAdminToken(expected);

    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: getAdminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error('admin login error', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
