import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, getStripePriceIdForTier } from '@/lib/stripe';
import { getUserByEmail, upsertUserByEmail } from '@/lib/user-store';

export const runtime = 'nodejs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailRaw = (body?.email ?? '').toString();
    const tierRaw = (body?.tier ?? '').toString();

    const email = emailRaw.trim().toLowerCase();
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const tier = tierRaw as 'pro' | 'creator' | 'organization';
    if (tier !== 'pro' && tier !== 'creator' && tier !== 'organization') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const priceId = getStripePriceIdForTier(tier);

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const successUrl = `${origin}/pricing?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/pricing?canceled=1`;

    const existing = getUserByEmail(email);
    upsertUserByEmail(email, {
      verified: existing?.verified ?? false,
      tier: existing?.tier ?? 'free',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        email,
        tier,
      },
      subscription_data: {
        metadata: {
          email,
          tier,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('create-checkout-session error', error);
    const message = error instanceof Error ? error.message : 'Checkout session creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
