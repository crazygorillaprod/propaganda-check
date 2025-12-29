import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { setUserTier, upsertUserByEmail } from '@/lib/user-store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const stripe = getStripeClient();

  const signature = (await headers()).get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const email = (session.customer_details?.email || session.customer_email || session.metadata?.email || '').toString().trim().toLowerCase();
        const tier = (session.metadata?.tier || '').toString() as 'pro' | 'creator' | 'organization' | '';

        if (email) {
          upsertUserByEmail(email, {
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
            verified: true,
          });

          if (tier === 'pro' || tier === 'creator' || tier === 'organization') {
            setUserTier(email, tier);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = (subscription.metadata?.email || '').toString().trim().toLowerCase();
        if (email) {
          setUserTier(email, 'free');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const email = (subscription.metadata?.email || '').toString().trim().toLowerCase();
        const tier = (subscription.metadata?.tier || '').toString() as 'pro' | 'creator' | 'organization' | '';
        if (email && (tier === 'pro' || tier === 'creator' || tier === 'organization')) {
          setUserTier(email, tier);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('stripe webhook handler error', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
