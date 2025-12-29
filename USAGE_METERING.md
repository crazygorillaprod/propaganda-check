# Usage Metering Implementation

**Core Principle:** Fact checks cost money. Thinking does not.

---

## What Gets Metered

### ✅ COUNTS as a "Fact Check" (expensive)

**Trigger:** External evidence retrieval

- URL analysis with live web scraping
- Claim verification with search API calls
- Article parsing requiring new evidence
- YouTube transcript fetching (Tier 3)
- Reddit thread scraping (Tier 3)
- Government source queries (Tier 3)
- Any operation calling Brave Search API or similar

### ❌ DOES NOT COUNT (cheap/free)

**These operations are unlimited:**

- Re-running analysis on cached evidence
- Generating rebuttals from existing data
- Creating teaching takes from cached results
- Producing commentary scripts
- Reframing existing evidence
- Switching views/tabs
- Reading past reports
- Viewing previously generated results
- Copying text
- Exporting summaries
- Educational content access

---

## Tier Limits

| Tier | Fact Checks/Month | Analysis Runs | Rollover | Cost/Check | Revenue | Margin |
|------|-------------------|---------------|----------|------------|---------|--------|
| Free | 10 | N/A | No | $0.22 | $0 | -$2.20 |
| Pro | 50 | Unlimited | No | $0.22 | $10-15 | $0-$4 |
| Creator | 200-300 | Unlimited | Yes (2×) | $0.22 | $50-100 | $16-$34 |

---

## Data Model

### User Usage Tracking

```typescript
export type UsageTier = 'free' | 'pro' | 'creator';

export type UsagePeriod = {
  user_id: string;
  tier: UsageTier;
  period_start: Date;
  period_end: Date;
  
  // Fact checks (metered)
  fact_checks_used: number;
  fact_checks_limit: number;
  fact_checks_rollover: number;
  
  // Analysis runs (unmetered for paid tiers)
  analysis_runs_used: number;
  
  // Cost tracking
  estimated_cost: number;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
};

export type UsageEvent = {
  id: string;
  user_id: string;
  event_type: 'fact_check' | 'analysis_run';
  
  // What was analyzed
  input_type: 'url' | 'text' | 'claim' | 'video' | 'thread';
  input_hash: string;  // For cache detection
  
  // Cost attribution
  cost_estimate: number;
  apis_called: string[];  // ['brave-search', 'youtube', 'reddit']
  
  // Results
  claims_extracted: number;
  evidence_retrieved: number;
  used_cache: boolean;
  
  // Timestamps
  timestamp: Date;
  processing_time_ms: number;
};

export type CachedAnalysis = {
  input_hash: string;
  input_type: 'url' | 'text' | 'claim';
  input_content: string;
  
  // Cache metadata
  created_at: Date;
  expires_at: Date;
  access_count: number;
  last_accessed: Date;
  
  // Cached results
  analysis_result: string;  // JSON stringified AnalysisResult
  
  // Cost savings
  original_cost: number;
};
```

---

## Cache Strategy

### Hash Generation

```typescript
import crypto from 'crypto';

export function generateInputHash(
  inputType: 'url' | 'text' | 'claim',
  content: string,
  timestamp?: Date
): string {
  // For URLs: normalize and strip query params that don't affect content
  let normalizedContent = content.trim().toLowerCase();
  
  if (inputType === 'url') {
    try {
      const url = new URL(content);
      // Remove tracking params
      url.searchParams.delete('utm_source');
      url.searchParams.delete('utm_medium');
      url.searchParams.delete('utm_campaign');
      normalizedContent = url.toString();
    } catch (e) {
      // Not a valid URL, use as-is
    }
  }
  
  // Include date bucket for time-sensitive content (news)
  const dateBucket = timestamp 
    ? timestamp.toISOString().split('T')[0]  // YYYY-MM-DD
    : new Date().toISOString().split('T')[0];
  
  return crypto
    .createHash('sha256')
    .update(`${inputType}:${normalizedContent}:${dateBucket}`)
    .digest('hex');
}
```

### Cache Duration

```typescript
export function getCacheDuration(inputType: 'url' | 'text' | 'claim'): number {
  // Return milliseconds
  switch (inputType) {
    case 'url':
      return 24 * 60 * 60 * 1000;  // 24 hours (news may update)
    case 'text':
      return 7 * 24 * 60 * 60 * 1000;  // 7 days
    case 'claim':
      return 30 * 24 * 60 * 60 * 1000;  // 30 days
    default:
      return 24 * 60 * 60 * 1000;
  }
}
```

### Cache Lookup

```typescript
export async function lookupCache(
  inputHash: string
): Promise<CachedAnalysis | null> {
  // Check if cache exists and hasn't expired
  const cached = await db.cachedAnalysis.findUnique({
    where: { input_hash: inputHash }
  });
  
  if (!cached) return null;
  
  if (new Date() > cached.expires_at) {
    // Cache expired, delete it
    await db.cachedAnalysis.delete({
      where: { input_hash: inputHash }
    });
    return null;
  }
  
  // Update access count
  await db.cachedAnalysis.update({
    where: { input_hash: inputHash },
    data: {
      access_count: cached.access_count + 1,
      last_accessed: new Date()
    }
  });
  
  return cached;
}
```

---

## Usage Tracking Implementation

### Check Quota

```typescript
export async function checkQuota(
  userId: string,
  eventType: 'fact_check' | 'analysis_run'
): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  const period = await getCurrentUsagePeriod(userId);
  
  if (eventType === 'analysis_run') {
    // Analysis runs are unlimited for paid tiers
    if (period.tier === 'pro' || period.tier === 'creator') {
      return { allowed: true, remaining: Infinity };
    }
    // Free tier doesn't have analysis runs
    return { allowed: false, remaining: 0, reason: 'Upgrade to Pro for analysis tools' };
  }
  
  if (eventType === 'fact_check') {
    const totalAvailable = period.fact_checks_limit + period.fact_checks_rollover;
    const remaining = totalAvailable - period.fact_checks_used;
    
    if (remaining > 0) {
      return { allowed: true, remaining };
    }
    
    return {
      allowed: false,
      remaining: 0,
      reason: `You've reached your monthly fact-check limit (${period.fact_checks_limit}). Upgrade for more.`
    };
  }
  
  return { allowed: false, remaining: 0, reason: 'Unknown event type' };
}
```

### Record Usage

```typescript
export async function recordUsage(
  userId: string,
  eventType: 'fact_check' | 'analysis_run',
  details: {
    inputType: string;
    inputHash: string;
    costEstimate: number;
    apisCalled: string[];
    claimsExtracted: number;
    evidenceRetrieved: number;
    usedCache: boolean;
    processingTimeMs: number;
  }
): Promise<void> {
  // Create usage event
  await db.usageEvent.create({
    data: {
      user_id: userId,
      event_type: eventType,
      input_type: details.inputType,
      input_hash: details.inputHash,
      cost_estimate: details.costEstimate,
      apis_called: details.apisCalled,
      claims_extracted: details.claimsExtracted,
      evidence_retrieved: details.evidenceRetrieved,
      used_cache: details.usedCache,
      processing_time_ms: details.processingTimeMs,
      timestamp: new Date()
    }
  });
  
  // Update usage period
  if (eventType === 'fact_check') {
    await db.usagePeriod.update({
      where: {
        user_id_period: {
          user_id: userId,
          period_start: getCurrentPeriodStart()
        }
      },
      data: {
        fact_checks_used: { increment: 1 },
        estimated_cost: { increment: details.costEstimate }
      }
    });
  } else {
    await db.usagePeriod.update({
      where: {
        user_id_period: {
          user_id: userId,
          period_start: getCurrentPeriodStart()
        }
      },
      data: {
        analysis_runs_used: { increment: 1 }
      }
    });
  }
}
```

### Get Current Period

```typescript
export async function getCurrentUsagePeriod(userId: string): Promise<UsagePeriod> {
  const periodStart = getCurrentPeriodStart();
  const periodEnd = getCurrentPeriodEnd();
  
  // Try to find existing period
  let period = await db.usagePeriod.findUnique({
    where: {
      user_id_period: {
        user_id: userId,
        period_start: periodStart
      }
    }
  });
  
  if (!period) {
    // Create new period
    const user = await db.user.findUnique({ where: { id: userId } });
    const tier = user?.tier || 'free';
    
    period = await db.usagePeriod.create({
      data: {
        user_id: userId,
        tier,
        period_start: periodStart,
        period_end: periodEnd,
        fact_checks_used: 0,
        fact_checks_limit: getFactCheckLimit(tier),
        fact_checks_rollover: await calculateRollover(userId, tier),
        analysis_runs_used: 0,
        estimated_cost: 0
      }
    });
  }
  
  return period;
}

function getFactCheckLimit(tier: UsageTier): number {
  switch (tier) {
    case 'free': return 10;
    case 'pro': return 50;
    case 'creator': return 250;  // Can be configurable
    default: return 10;
  }
}

async function calculateRollover(userId: string, tier: UsageTier): Promise<number> {
  // Only creator tier gets rollover
  if (tier !== 'creator') return 0;
  
  // Get previous period
  const previousPeriod = await db.usagePeriod.findFirst({
    where: {
      user_id: userId,
      period_end: { lt: new Date() }
    },
    orderBy: { period_end: 'desc' }
  });
  
  if (!previousPeriod) return 0;
  
  const unused = previousPeriod.fact_checks_limit - previousPeriod.fact_checks_used;
  const maxRollover = getFactCheckLimit(tier) * 2;  // 2× monthly limit
  
  return Math.min(unused, maxRollover);
}

function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getCurrentPeriodEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}
```

---

## API Integration

### Analyze Endpoint with Metering

```typescript
// app/api/analyze/route.ts

import { checkQuota, recordUsage, lookupCache, generateInputHash } from '@/lib/metering';

export async function POST(req: Request) {
  const { url, text, userId } = await req.json();
  
  // Determine input type
  const inputType = url ? 'url' : 'text';
  const content = url || text;
  
  // Generate hash for cache lookup
  const inputHash = generateInputHash(inputType, content);
  
  // Check cache first (doesn't count against quota)
  const cached = await lookupCache(inputHash);
  if (cached) {
    return Response.json({
      ...JSON.parse(cached.analysis_result),
      cached: true,
      cost: 0
    });
  }
  
  // Check quota
  const quota = await checkQuota(userId, 'fact_check');
  if (!quota.allowed) {
    return Response.json(
      {
        error: 'Quota exceeded',
        message: quota.reason,
        remaining: quota.remaining
      },
      { status: 429 }
    );
  }
  
  // Perform analysis
  const startTime = Date.now();
  const result = await performAnalysis(content, inputType);
  const processingTime = Date.now() - startTime;
  
  // Calculate cost
  const costEstimate = calculateCost(result);
  
  // Record usage
  await recordUsage(userId, 'fact_check', {
    inputType,
    inputHash,
    costEstimate,
    apisCalled: ['brave-search'],  // Track actual APIs used
    claimsExtracted: result.claims.length,
    evidenceRetrieved: result.claims.reduce((sum, c) => sum + c.evidence.length, 0),
    usedCache: false,
    processingTimeMs: processingTime
  });
  
  // Cache the result
  await cacheAnalysis(inputHash, inputType, content, result, costEstimate);
  
  // Return result with usage info
  return Response.json({
    ...result,
    cached: false,
    cost: costEstimate,
    remaining: quota.remaining - 1
  });
}

function calculateCost(result: AnalysisResult): number {
  const searchCost = result.claims.length * 0.005;  // $0.005 per search
  const llmCost = 0.15;  // Average LLM cost
  return searchCost + llmCost;
}
```

### Teaching Take Endpoint (Unlimited)

```typescript
// app/api/teaching-take/route.ts

export async function POST(req: Request) {
  const { analysisId, userId } = await req.json();
  
  // Get cached analysis (doesn't trigger fact check)
  const analysis = await db.analysis.findUnique({
    where: { id: analysisId }
  });
  
  if (!analysis) {
    return Response.json({ error: 'Analysis not found' }, { status: 404 });
  }
  
  // Check if user has access to teaching takes
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.tier === 'free') {
    return Response.json(
      { error: 'Upgrade to Pro for Teaching Takes' },
      { status: 403 }
    );
  }
  
  // Generate teaching take (doesn't count against fact check quota)
  const teachingTake = await generateTeachingTake(analysis);
  
  // Record as analysis run (tracked but not metered for paid tiers)
  await recordUsage(userId, 'analysis_run', {
    inputType: 'teaching_take',
    inputHash: analysisId,
    costEstimate: 0.05,  // Minimal cost
    apisCalled: [],
    claimsExtracted: 0,
    evidenceRetrieved: 0,
    usedCache: true,
    processingTimeMs: 500
  });
  
  return Response.json(teachingTake);
}
```

---

## UX Copy

### Free Tier Soft Lock

```tsx
// When limit reached
<Alert variant="warning">
  <h3>You've reached your monthly fact-check limit</h3>
  <p>
    You've used all 10 fact checks this month. You can still:
  </p>
  <ul>
    <li>View your previous analyses</li>
    <li>Read past reports</li>
    <li>Access educational content</li>
  </ul>
  <Button>Upgrade for 50 checks/month + teaching tools</Button>
</Alert>
```

### Usage Display

```tsx
// In user dashboard
<UsageCard>
  <h4>Fact Checks</h4>
  <Progress value={factChecksUsed} max={factChecksLimit + rollover} />
  <p>
    {factChecksUsed} / {factChecksLimit} used this month
    {rollover > 0 && ` (+${rollover} rollover credits)`}
  </p>
  <p className="text-sm text-muted">
    Resets on {periodEnd.toLocaleDateString()}
  </p>
</UsageCard>

{tier !== 'free' && (
  <UsageCard>
    <h4>Analysis Runs</h4>
    <p className="text-lg font-bold">Unlimited</p>
    <p className="text-sm text-muted">
      {analysisRunsUsed} runs this month
    </p>
  </UsageCard>
)}
```

### Pre-Analysis Warning

```tsx
// Before running fact check
<ConfirmDialog>
  <p>
    This will use 1 fact check.
    <strong>You have {remaining} checks remaining this month.</strong>
  </p>
  <p className="text-sm text-muted">
    After checking, you can generate unlimited rebuttals and teaching tools.
  </p>
  <Button>Continue</Button>
</ConfirmDialog>
```

### Pricing Page Copy

```tsx
<PricingTier tier="free">
  <h3>Quick Check</h3>
  <Price>Free</Price>
  <Feature>
    <strong>10 fact checks per month</strong>
    <span>Best for quick verification before sharing</span>
  </Feature>
  <Feature>Claims analysis</Feature>
  <Feature>Evidence clusters</Feature>
  <Feature>Language risk labels</Feature>
  <Feature>Short rebuttals</Feature>
</PricingTier>

<PricingTier tier="pro">
  <h3>Defense Mode</h3>
  <Price>$12/month</Price>
  <Feature>
    <strong>50 fact checks per month</strong>
    <span>Plus unlimited analysis tools</span>
  </Feature>
  <Feature>Full Teaching Takes</Feature>
  <Feature>Rebuttal toolkit (3 lengths)</Feature>
  <Feature>Action plans</Feature>
  <Feature>Export & citation tools</Feature>
  <Notice>
    Fact checks use live sources. Analysis tools are unlimited.
  </Notice>
</PricingTier>

<PricingTier tier="creator">
  <h3>Full Spectrum</h3>
  <Price>$79/month</Price>
  <Feature>
    <strong>250 fact checks per month</strong>
    <span>With rollover credits (up to 500 total)</span>
  </Feature>
  <Feature>Unlimited analysis runs</Feature>
  <Feature>Multi-platform aggregation</Feature>
  <Feature>YouTube transcripts</Feature>
  <Feature>Reddit analysis</Feature>
  <Feature>Receipt packs</Feature>
  <Feature>Commentary scripts</Feature>
  <Notice>
    Run 1 fact check → Generate 10-20 analysis outputs
  </Notice>
</PricingTier>
```

---

## Database Schema

### Prisma Schema

```prisma
model User {
  id            String        @id @default(cuid())
  email         String        @unique
  tier          String        @default("free") // 'free' | 'pro' | 'creator'
  usagePeriods  UsagePeriod[]
  usageEvents   UsageEvent[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model UsagePeriod {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  tier                  String
  periodStart           DateTime
  periodEnd             DateTime
  factChecksUsed        Int      @default(0)
  factChecksLimit       Int
  factChecksRollover    Int      @default(0)
  analysisRunsUsed      Int      @default(0)
  estimatedCost         Float    @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([userId, periodStart])
  @@index([userId])
  @@index([periodStart, periodEnd])
}

model UsageEvent {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id])
  eventType          String   // 'fact_check' | 'analysis_run'
  inputType          String
  inputHash          String
  costEstimate       Float
  apisCalled         String[] // JSON array
  claimsExtracted    Int
  evidenceRetrieved  Int
  usedCache          Boolean
  processingTimeMs   Int
  timestamp          DateTime @default(now())
  
  @@index([userId, timestamp])
  @@index([inputHash])
}

model CachedAnalysis {
  inputHash       String   @id
  inputType       String
  inputContent    String   @db.Text
  createdAt       DateTime @default(now())
  expiresAt       DateTime
  accessCount     Int      @default(0)
  lastAccessed    DateTime @default(now())
  analysisResult  String   @db.Text // JSON stringified
  originalCost    Float
  
  @@index([expiresAt])
}
```

---

## Engineering Rules (CRITICAL)

### A "fact check" is triggered ONLY when:
- ✅ External search APIs are called (Brave, Google, etc.)
- ✅ New evidence is fetched from the web
- ✅ YouTube transcripts are pulled
- ✅ Reddit threads are scraped
- ✅ Government sources are queried

### Do NOT count:
- ❌ Re-running analysis on cached evidence
- ❌ Switching views
- ❌ Copying text
- ❌ Exporting summaries
- ❌ Generating rebuttals from existing data
- ❌ Reading past reports

### Cache aggressively:
- Hash input (URL + date bucket)
- If same article is checked within cache window → reuse evidence
- Don't charge again unless user forces refresh
- Track cache hits for cost savings metrics

### Rollover credits (Creator tier only):
- Unused checks roll over month-to-month
- Cap at 2× monthly limit (500 max for 250/month tier)
- Builds loyalty, costs very little
- Use oldest credits first (FIFO)

---

## Cost Monitoring

### Metrics to Track

```typescript
export type CostMetrics = {
  period: string;
  
  // Per tier
  free_tier: {
    users: number;
    fact_checks: number;
    total_cost: number;
    cost_per_user: number;
  };
  
  pro_tier: {
    users: number;
    fact_checks: number;
    analysis_runs: number;
    total_cost: number;
    revenue: number;
    margin: number;
  };
  
  creator_tier: {
    users: number;
    fact_checks: number;
    analysis_runs: number;
    total_cost: number;
    revenue: number;
    margin: number;
  };
  
  // Cache efficiency
  cache: {
    hit_rate: number;
    cost_saved: number;
  };
  
  // Overall
  total_cost: number;
  total_revenue: number;
  total_margin: number;
};
```

### Alerts

Set up alerts for:
- Free tier users exceeding expected usage
- Creator tier users using < 50% of quota (churn risk)
- Cache hit rate dropping below 30%
- Costs exceeding revenue by >20%
- Unusual API failures

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Design database schema
- [ ] Implement hash generation
- [ ] Build cache lookup/storage
- [ ] Create usage tracking functions

### Phase 2: Metering (Week 2)
- [ ] Implement quota checking
- [ ] Add usage recording
- [ ] Build rollover calculation
- [ ] Create period management

### Phase 3: Integration (Week 3)
- [ ] Update analyze endpoint with metering
- [ ] Add cache-first logic
- [ ] Implement soft locks
- [ ] Create usage dashboard UI

### Phase 4: UX (Week 4)
- [ ] Add usage displays
- [ ] Build pre-analysis warnings
- [ ] Create upgrade CTAs
- [ ] Design pricing page

### Phase 5: Monitoring (Week 5)
- [ ] Set up cost tracking
- [ ] Build admin dashboard
- [ ] Configure alerts
- [ ] Create usage reports

---

## Success Metrics

### Cost Control
- Cache hit rate > 30%
- Cost per fact check < $0.30
- Gross margin > 40% (Pro tier)
- Gross margin > 60% (Creator tier)

### User Satisfaction
- < 5% of users hit limits in first week
- Upgrade rate from Free → Pro > 5%
- Churn rate < 10%
- NPS > 40

### Business Health
- CAC payback < 6 months
- LTV:CAC ratio > 3:1
- Monthly recurring revenue growth > 10%

---

**Remember:** This model protects your costs while maximizing user value. Generous where it's cheap (analysis), metered where it's expensive (retrieval).
