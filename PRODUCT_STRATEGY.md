# Product Strategy: Tiered Propaganda-Defense Platform

**Core positioning:**  
"Evidence-first analysis for people who take democracy seriously."

**Not:** "We fight propaganda" (avoids partisan labeling, platform suppression, bad-faith attacks)

---

## Three User Intents = Three Tiers

| User Type | Intent | Tier |
|-----------|--------|------|
| Casual users | "Is this true or propaganda?" | 🟢 Free |
| Engaged citizens | "How do I explain this to others?" | 🔵 Civic/Pro |
| Commentators/Organizers/Educators | "I need receipts, synthesis, rebuttals, and action framing *fast*" | 🔴 Creator |

---

## 🟢 TIER 1 — PUBLIC / FREE

### "Quick Check"

**Target:** General public, social media users, people reacting to headlines/comments/viral posts

### Inputs
- Headline
- URL
- Single claim
- Comment text

### Outputs
- ✅ Verification status (Supported / Mixed / Not verified)
- ✅ Claims analysis
- ✅ Evidence clusters (collapsed)
- ✅ Language risk (labels only, no numeric score by default)
- ✅ Calm rebuttal (short, neutral)
- ✅ Suggested searches

### Limits (important for upsell)
- **10 fact checks per month** (hard cap)
- Limited number of sources per claim
- No long-form synthesis
- No multi-platform scraping
- No export / citation builder

### After Limit Reached
**Soft lock:**
> "You've reached your monthly fact-check limit."

**Still allow:**
- Reading past reports
- Viewing previously generated results
- Educational content

**CTA:**
> "Upgrade for deeper analysis and more checks."

### Value Message
> **"10 fact checks per month"**  
> Best for quick verification before sharing.

### Current Implementation Status
✅ **COMPLETE** — All core features implemented  
⏳ **NEEDED** — Usage tracking and metering

---

## 🔵 TIER 2 — CIVIC / PRO

### "Defense Mode"

**Target:** Teachers, activists, parents, community leaders, engaged voters

### New Inputs Unlocked
- Full articles
- Long comments / threads
- Discussion prompts
- Multiple claims at once

### New Outputs

#### ✅ Teaching Take (full breakdown)
- What we know / don't know
- How it's being framed
- Pro-democracy interpretation
- Rebuttal toolkit (20s / 60s / 2–3 min)
- Talk tracks ("If they say X, say Y")
- Action plan (today / this week / ongoing)

#### ✅ Expanded sourcing
- More outlets per claim
- Stronger corroboration requirements
- Evidence clustering by narrative, not just claim

#### ✅ Export tools
- Copy rebuttal
- Share summary
- Cite sources (APA-style light citations)

### Usage Limits
- **50 fact checks per month**
- Unlimited analysis runs (rebuttals, teaching takes, action plans)
- Reading/viewing past reports doesn't count

### What Counts vs What Doesn't

**Counts toward limit:**
- URL analysis with live evidence retrieval
- Claim analysis with corroboration
- Article parsing with new searches

**Does NOT count:**
- Reading Teaching Takes
- Generating rebuttals from existing evidence
- Viewing saved reports
- Editing/copying rebuttal scripts
- Exporting summaries

### Still Limited
- No deep platform scraping
- No YouTube transcript pulls
- No Reddit deep dives

### Usage Limits
- **200-300 fact checks per month**
- **Unlimited analysis runs**
- Rollover credits: Unused checks roll over up to 2× monthly limit

### The Power User Model

**Fact checks** (counted):
- Multi-platform evidence aggregation
- YouTube transcript pulls
- Reddit thread scraping
- Government source queries

**Analysis runs** (unlimited):
- Generate rebuttals
- Create teaching takes
- Produce commentary scripts
- Reframe existing evidence
- Generate action plans
- Create receipt packs
- Build talking points

**Key insight:** Run 1 fact check → Generate 10-20 analysis outputs

### Value Message
> **"200+ fact checks per month"**  
> Designed for commentary, research, and publishing.  
> Fact checks use live sources. Analysis tools are unlimited.

### Value Message
> **"50 fact checks per month"**  
> Includes full breakdowns, rebuttals, and civic action guides.  
> Fact checks use live sources. Analysis tools are unlimited.

### Why This Matters
> "Enough for weekly civic engagement, teaching, and family discussions."

### Current Implementation Status
🚧 **PARTIAL**
- ✅ Teaching Take type defined
- ✅ Teaching Take generation module created
- ⏳ Usage tracking and metering (not yet implemented)
- ⏳ Export tools (not yet implemented)
- ⏳ Narrative-level evidence clustering (not yet implemented)
- ⏳ UI for Teaching Take display (not yet implemented)

---

## 🔴 TIER 3 — COMMENTARY / CREATOR / JOURNALIST

### "Full Spectrum Analysis"

**Target:** Political commentators, journalists, researchers, podcast hosts, YouTubers, community organizers, people who *cannot afford* to get this wrong

### Inputs (Almost Anything)
- Single comment
- Thread (X / FB / Reddit)
- Full article
- Video URL (YouTube)
- Reddit post + comments
- Talking points
- Script draft

---

## 🧠 What Tier 3 Does (THE MAGIC)

### 1. Multi-Platform Evidence Aggregation

System capabilities:
- Pulls **articles** (AP, Reuters, BBC, local outlets)
- Pulls **YouTube transcripts** (when public)
- Pulls **Reddit discussions** (high-signal threads only)
- Cross-references **official sources** (.gov, election offices, court docs)
- De-duplicates narratives across platforms

**🔑 Key insight:** Not "what people are saying" — **what claims repeat, where they originate, and who benefits**

---

### 2. Narrative-Level Analysis

**Beyond:** Claim → Evidence

**Addition:** Narrative → Framing → Impact → Risk → Counter

**Examples:**
- "Peace talks" framing vs actual diplomatic timelines
- "Dark money" vs legally defined campaign finance categories
- "Election integrity" vs voter suppression language

---

### 3. Commentary-Ready Outputs

#### 🧾 RECEIPT PACK
- Top 10 verifiable facts
- Top 5 misrepresentations
- Who said what (with timestamps / links)
- What's provable vs speculative

#### 🎙️ TALKING POINTS
- 30-second
- 60-second
- Long-form breakdown
- Safe language vs risky phrasing

#### 🧠 PROPAGANDA PATTERN MAP
- What tactic is being used
- Where it's been used before
- Why it works psychologically
- How to disrupt it without escalating

---

### 4. Action Framing (CRITICAL)

**Not:** "go fight"

**Instead:**

What this means for:
- Voters
- Workers
- Families
- Marginalized communities
- Democratic norms

And:
- What institutions should be doing
- What citizens can legally do
- What platforms should be held accountable for

---

### Current Implementation Status
⏳ **PLANNED** (not yet implemented)
- Multi-platform scrapers
- YouTube transcript integration
- Reddit analysis
- Narrative-level clustering
- Receipt pack generation
- Propaganda pattern mapping
- Advanced action framing

---

## ⚠️ LEGAL + ETHICAL GUARDRAILS (NON-NEGOTIABLE)

To protect **you and users**, especially in Tier 3:

### Must Always:
1. ✅ **Distinguish fact vs interpretation**
2. ✅ **Avoid labeling people as racist/evil unless backed by direct evidence**
3. ✅ **Focus on behaviors, systems, outcomes** (not character judgments)
4. ✅ **Cite everything**
5. ✅ **Provide disclaimers**

### Standard Disclaimer Template:
> "Analysis is informational and protected speech. Conclusions are evidence-based interpretations."

### This Keeps You:
- ✅ Constitutionally protected
- ✅ Platform-safe
- ✅ Credible across ideological lines

---

## Pricing Philosophy

**Core Principle:** 
> 👉 **Fact checks cost money. Thinking does not.**

**Meter retrieval, not insight.**

- Meter anything that hits external APIs, scrapers, transcripts, searches
- Do **NOT** meter UI views, reading, or learning features

This avoids punishing curiosity while protecting your burn rate.

---

## Usage-Based Tier Model

### 🟢 Free Tier
**10 fact checks / month** (hard cap)

A *fact check* = any analysis that performs **external evidence retrieval**

| Tier | Monthly Limit | Cost Estimate | Price | Margin |
|------|--------------|---------------|-------|--------|
| 🟢 Free | 10 fact checks | $2.20 | $0 | -$2.20 (acquisition cost) |
| 🔵 Pro | 50 fact checks | $11.00 | $10-15/mo | Breakeven to modest profit |
| 🔴 Creator | 200-300 fact checks | $44-66 | $50-100/mo | Healthy margin |

### What Counts as a "Fact Check"
**COUNTS (expensive):**
- Pull web articles
- Scrape multiple outlets
- Pull YouTube transcripts (Tier 3)
- Scan Reddit threads (Tier 3)
- Query government sources (Tier 3)

**DOES NOT COUNT (cheap):**
- Re-running analysis on cached evidence
- Generating rebuttals from existing data
- Creating teaching takes from existing evidence
- Producing commentary scripts
- Switching views
- Copying text
- Exporting summaries
- Reading past reports
- Viewing previously generated results

### The Smart Split: Fact Checks vs Analysis Runs

**Meter A — Fact Checks** (expensive)
- External API calls
- Live evidence retrieval
- New source scraping

**Meter B — Analysis Runs** (cheap, unlimited for paid tiers)
- Rebuttal generation
- Teaching take creation
- Commentary scripts
- Action plans
- Reframing existing evidence

### Example Creator Workflow
1️⃣ Run **1 fact check** on a viral clip → Gets evidence + clusters  
2️⃣ Generate (unlimited):
   - 30-sec rebuttal
   - 60-sec rebuttal
   - Podcast outline
   - IG caption
   - Talking points
   - Action plan

➡️ **Still only used 1 fact check**

This is massive value for creators.

### Why This Model Works:
- ⏱️ **Saves hours** of research time
- 🛡️ **Reduces risk** of getting facts wrong
- 📋 **Gives receipts** for accountability
- 🎯 **Keeps them credible** in public discourse
- 💰 **Protects your costs** while maximizing user value
- 🎁 **Feels generous**, not restrictive

---

## Implementation Roadmap

### Phase 1: Foundation (✅ COMPLETE)
- [x] Basic claim extraction
- [x] Evidence retrieval
- [x] Verifiability scoring
- [x] Tactics detection
- [x] Basic UI

### Phase 2: Civic Tier (🚧 IN PROGRESS)
- [x] Teaching Take type definition
- [x] Teaching Take generation logic
- [ ] UI for Teaching Take display
- [ ] Export functionality
- [ ] Narrative clustering
- [ ] Enhanced evidence presentation

### Phase 3: Creator Tier (⏳ PLANNED)
- [ ] YouTube transcript integration
- [ ] Reddit scraping & analysis
- [ ] Multi-platform aggregation
- [ ] Receipt pack generation
- [ ] Advanced talking points
- [ ] Propaganda pattern database
- [ ] Action framing engine
- [ ] Citation builder

### Phase 4: Polish & Scale
- [ ] API for third-party integrations
- [ ] Browser extension
- [ ] Mobile apps
- [ ] Collaborative features
- [ ] Historical pattern tracking

---

## Success Metrics by Tier

### Tier 1 (Free)
- Daily active checks
- Conversion to Tier 2
- User retention
- Share rate

### Tier 2 (Civic/Pro)
- Teaching Takes generated
- Export usage
- User testimonials
- Renewal rate

### Tier 3 (Creator)
- Time saved per analysis
- Content published using platform
- User credibility maintained
- Revenue per user

---

## Competitive Positioning

### What Makes This Different:

1. **Not just fact-checking** → Full defense toolkit
2. **Not just verification** → Practical rebuttals + action plans
3. **Not just for journalists** → Accessible to everyone who cares
4. **Not partisan** → Evidence-first, constitutionally protected
5. **Not reactive** → Proactive framing analysis

### Messaging Framework:

**Don't say:** "Fight misinformation"  
**Do say:** "Evidence-first analysis"

**Don't say:** "Detect propaganda"  
**Do say:** "Understand framing tactics"

**Don't say:** "Protect democracy"  
**Do say:** "Take democracy seriously"

---

## Risk Mitigation

### Platform Risk
- Neutral, evidence-based language
- Constitutional protections via disclaimers
- Focus on behaviors, not people
- Clear fact vs interpretation separation

### Legal Risk
- All claims cited
- No invented quotes or sources
- Protected speech framework
- User-generated content protections

### Credibility Risk
- Transparent methodology
- Open about limitations
- Corrections policy
- Diverse evidence sources

### Financial Risk
- Free tier builds audience
- Pro tier validates willingness to pay
- Creator tier = sustainable revenue
- B2B opportunities (newsrooms, schools)

---

## Next Steps

### Immediate (This Week)
1. Complete Teaching Take UI implementation
2. Add export functionality
3. Improve evidence clustering display
4. Document API patterns for future tiers

### Short-term (This Month)
1. User testing with Tier 2 features
2. Pricing validation research
3. Begin Tier 3 architecture planning
4. Build evidence for investor/grant pitches

### Medium-term (This Quarter)
1. Launch Tier 2 (Civic/Pro) beta
2. Build YouTube transcript integration
3. Create propaganda pattern database
4. Develop citation builder

---

## Questions to Resolve

1. **Authentication:** How do we handle tier access? (Stripe? Auth0? Custom?)
2. **Rate limiting:** Per-user or per-tier aggregate?
3. **Data retention:** How long do we keep analysis history?
4. **API access:** Do we offer API to Tier 3 users?
5. **White-label:** Do newsrooms/schools get custom deployments?
6. **Partnerships:** Academic institutions? Journalism schools? Civic orgs?

---

**Last reminder:** This is not "fighting propaganda." This is **empowering evidence-based discourse for people who take democracy seriously.**

That framing is your shield and your brand.
