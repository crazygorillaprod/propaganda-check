This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Propaganda Buster by BFMbreakdown

This application analyzes news articles and claims for verifiability and manipulation tactics using AI-powered fact-checking.

### Key Features

- **Claim Extraction**: Identifies key claims from articles using GPT-4
- **Attribution Detection**: Recognizes direct quotes, reported speech, and official statements
- **External Corroboration**: Searches reputable sources (Reuters, AP, BBC, .gov) for evidence
- **Verifiability Scoring**: Comprehensive 0-100 scoring with breakdown:
  - Attribution (0-30): Quality of source attribution
  - First Corroboration (0-30): Initial reputable source found
  - Additional Corroboration (0-20): Multiple independent sources
  - Specificity (0-20): Claim checkability and detail
- **Claim-Type Weighting**: QUOTE, EVENT, and SCHEDULE claims scored differently
- **Manipulation Detection**: Identifies propaganda tactics and techniques

### Documentation

- **[Verifiability Scoring](VERIFIABILITY_SCORING.md)**: Complete scoring methodology, examples, and API format
- **[Evidence Retrieval](EVIDENCE_RETRIEVAL.md)**: External evidence retrieval system documentation
- **[Evidence Flow](EVIDENCE_FLOW.md)**: Visual diagram of evidence retrieval process
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)**: Complete implementation status and verification
- **[Data Model](DATA_MODEL_IMPLEMENTATION.md)**: Type definitions and data structures

### Code Examples

- **[Evidence Retrieval Examples](examples/evidence-retrieval-examples.ts)**: 8 practical examples of using the evidence retrieval API

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory (you can start from `.env.local.example`) with:

```bash
# Required: OpenAI API key for AI analysis
OPENAI_API_KEY=your_openai_api_key_here

# Required: Brave Search API key for evidence retrieval
# Without this, verifiability status will be NOT_RUN
BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here

# Optional: Stripe billing (subscriptions)
# Required if you want /pricing upgrade buttons and Stripe Checkout to work.
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (one per paid tier)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_ORGANIZATION=price_...

# Admin back office (password-protected)
# Enables /admin and /api/admin/*
ADMIN_PASSWORD=choose_a_strong_password
```

**Getting API Keys:**
- **Brave Search**: Visit https://brave.com/search/api/ to sign up
- **OpenAI**: Visit https://platform.openai.com/ to get API key

### Stripe (Billing) Setup

This app uses Stripe Checkout + webhooks:

- Checkout session endpoint: `/api/billing/create-checkout-session`
- Webhook endpoint: `/api/billing/webhook`

To test locally:

1. Create Products + Prices in Stripe for `pro`, `creator`, and `organization`, then set `STRIPE_PRICE_*` in `.env.local`.
2. Install Stripe CLI and forward webhooks:

```bash
stripe listen --forward-to http://localhost:3000/api/billing/webhook
```

3. Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Notes:
- Tier upgrades are applied when Stripe sends `checkout.session.completed`.
- In this repo, user/tier state is stored in-memory (see `lib/user-store.ts`), so it resets when the server restarts.

### Admin Back Office

- Visit `/admin` and log in with `ADMIN_PASSWORD`.
- The admin dashboard can:
  - View metering + cache stats
  - Manually set a user tier for testing
  - Invalidate cache entries

### Run Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
