import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { upsertUserByEmail } from '@/lib/user-store';

// In-memory storage (use PostgreSQL in production)
const emailStore = new Map<string, {
  email: string;
  verificationToken: string;
  verified: boolean;
  signupDate: string;
  tier: 'free' | 'pro' | 'creator' | 'organization';
}>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = emailStore.get(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Email already registered',
        verified: existingUser.verified,
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store user data
    const userData = {
      email: email.toLowerCase(),
      verificationToken,
      verified: false,
      signupDate: new Date().toISOString(),
      tier: 'free' as const,
    };

    emailStore.set(email.toLowerCase(), userData);
    upsertUserByEmail(email.toLowerCase(), { tier: 'free', verified: false });

    // In production, send verification email here
    console.log('📧 Email signup:', {
      email: email.toLowerCase(),
      verificationLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`,
    });

    // For now, return the token (in production, only send via email)
    return NextResponse.json({
      success: true,
      message: 'Signup successful',
      // Remove this in production - only send via email
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}

// Get user by email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { error: 'Email required' },
      { status: 400 }
    );
  }

  const user = emailStore.get(email.toLowerCase());
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    email: user.email,
    verified: user.verified,
    tier: user.tier,
    signupDate: user.signupDate,
  });
}

// Export for use in other routes
export { emailStore };
