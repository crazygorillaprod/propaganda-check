import { NextRequest, NextResponse } from 'next/server';
import { emailStore } from '../signup/route';
import { upsertUserByEmail } from '@/lib/user-store';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token required' },
        { status: 400 }
      );
    }

    // Find user by token
    let foundEmail: string | null = null;
    for (const [email, userData] of emailStore.entries()) {
      if (userData.verificationToken === token) {
        foundEmail = email;
        break;
      }
    }

    if (!foundEmail) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Mark as verified
    const userData = emailStore.get(foundEmail);
    if (userData) {
      userData.verified = true;
      emailStore.set(foundEmail, userData);
    }

    upsertUserByEmail(foundEmail, { verified: true });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: foundEmail,
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// Check verification status
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token required' },
      { status: 400 }
    );
  }

  // Find user by token
  for (const [email, userData] of emailStore.entries()) {
    if (userData.verificationToken === token) {
      return NextResponse.json({
        email,
        verified: userData.verified,
      });
    }
  }

  return NextResponse.json(
    { error: 'Invalid token' },
    { status: 404 }
  );
}
