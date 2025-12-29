import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'How It Works — Evidence-First Investigative Research | Propaganda Buster',
  description: 'Professional-grade investigative synthesis engine for journalists, political professionals, and investigators. Evidence-first, journalist-safe, constitutional.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        <Header />

        {/* Hero Section */}
        <section className="mt-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How It Works</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-700">
            An <strong>evidence-first investigative synthesis engine</strong> that exposes propaganda, misinformation, 
            and narrative manipulation across platforms. Built for journalists, political professionals, and investigators 
            — accessible to everyone.
          </p>
        </section>

        {/* Mission */}
        <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Our Mission</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              <strong className="text-slate-900">Propaganda Buster</strong> exists to help people check the claims made by those in power.
              We provide evidence-first analysis, clear sourcing, and plain-language explanations so the public can understand what’s true, what’s unclear, and what’s spin — and respond responsibly.
            </p>
            <p>
              Our goal is to strengthen democracy by promoting transparency, accountability, and informed public discussion,
              without telling people what to think.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-extrabold text-slate-900">Why this works</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Centers power, not users (“claims made by those in power”)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Evidence-first (journalist-safe)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Plain language (public-safe)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Pro-democracy without partisan language</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Legally and constitutionally safe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Avoids moralizing or accusations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Positions the tool as infrastructure, not activism</span>
              </li>
            </ul>
          </div>
        </section>

        {/* What We Are */}
        <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">What This Is (And Isn't)</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              <strong className="text-slate-900">This is:</strong> A professional research tool that separates 
              verified facts from unverified claims, identifies propaganda tactics, and reveals evidence gaps — 
              all with journalist-safe, constitutionally-protected language.
            </p>
            <p>
              <strong className="text-slate-900">This is not:</strong> A simple "fact-checker." This is an 
              investigative synthesis engine that connects dots humans don't have time to, analyzes framing 
              techniques, and answers "what evidence is missing?"
            </p>
          </div>
        </section>

        {/* Four-Layer Architecture */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Our Four-Layer Architecture</h2>
          <p className="mt-3 text-sm text-slate-600">
            We analyze content in sequence. No interpretation happens before facts are established.
          </p>

          <div className="mt-6 space-y-6">
            {/* Layer 1 */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-blue-900">Factual Grounding</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-900">
                    Extract claims. Retrieve evidence from credible sources. Assess source credibility. 
                    Determine what is <strong>Supported</strong>, <strong>Unclear</strong>, or <strong>Unverified</strong>.
                  </p>
                  <p className="mt-2 text-xs text-blue-800">
                    <strong>Rule:</strong> No interpretation happens before this layer completes. This protects 
                    us legally and journalistically.
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-extrabold text-white">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-violet-900">Narrative & Propaganda Analysis</h3>
                  <p className="mt-2 text-sm leading-relaxed text-violet-900">
                    Identify <strong>how</strong> people are being manipulated. Analyze framing, word choice, 
                    emotional triggers, scapegoating, false certainty, authority laundering, repetition.
                  </p>
                  <p className="mt-2 text-xs text-violet-800">
                    <strong>Important:</strong> We never accuse intent. We identify patterns and effects. 
                    "This framing encourages fear" — not "they intend to manipulate."
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-extrabold text-white">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-emerald-900">Evidence Gap Analysis</h3>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                    Answer the questions journalists ask: <strong>What evidence is missing?</strong> What would 
                    prove this? What would disprove it? What sources would settle this?
                  </p>
                  <p className="mt-2 text-xs text-emerald-800">
                    <strong>This is where most tools fail</strong> — and where you save hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 4 */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-extrabold text-white">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-amber-900">Response & Action</h3>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900">
                    Get ready-to-use responses: What to say, what not to say, questions that force accountability, 
                    concrete actions. <strong>Optional</strong> for journalists who want neutrality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two Modes */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Two Modes, Two Audiences</h2>
          <p className="mt-3 text-sm text-slate-600">
            Same engine. Different presentation.
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {/* Public Mode */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900">Public Mode</h3>
              <p className="mt-2 text-xs font-semibold text-slate-600">Default • 6th-grade reading level</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Plain language, fast-scan UI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Pro-democracy framing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>"What to say back" included</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Action plan visible</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-600">
                <strong>For:</strong> General public, educators, activists
              </p>
            </div>

            {/* Professional Mode */}
            <div className="rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900">Professional Mode</h3>
              <p className="mt-2 text-xs font-semibold text-violet-700">Paid • Journalist-safe</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-600">✓</span>
                  <span>Strictly neutral tone</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-600">✓</span>
                  <span>Evidence-first presentation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-600">✓</span>
                  <span>Full narrative analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-600">✓</span>
                  <span>Evidence gap assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-600">✓</span>
                  <span>Sourcing tables & timelines</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-600">
                <strong>For:</strong> Journalists, political pros, investigators, legal teams
              </p>
            </div>
          </div>
        </section>

        {/* Language Safety */}
        <section className="mt-12 rounded-xl border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-lg">
          <h2 className="text-xl font-extrabold">Language Safety Rules</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Our system is designed to be <strong>constitutional, platform-safe, and journalist-safe</strong>. 
            We describe patterns and effects — never motives or character.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">"This person is racist"</p>
                  <p className="mt-1 text-xs text-slate-400">Accusation of character</p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="text-emerald-400">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    "This framing targets [group] and has historically been associated with [pattern]"
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Description of pattern</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">"They're trying to divide Americans"</p>
                  <p className="mt-1 text-xs text-slate-400">Assumes intent</p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="text-emerald-400">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    "This narrative emphasizes group conflict and may increase polarization"
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Describes effect</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <span className="text-red-400">✗</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">"This is propaganda designed to manipulate voters"</p>
                  <p className="mt-1 text-xs text-slate-400">Accusation of intent</p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <span className="text-emerald-400">✓</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-300">
                    "This content uses emotional appeals and selective framing common in persuasive messaging"
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Neutral description of technique</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Who Uses This</h2>
          
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">📰 Journalists</h3>
              <p className="mt-2 text-sm text-slate-700">
                Rapid claim verification, narrative analysis, sourcing tables. Save hours on research. 
                Get evidence gaps identified automatically.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">⚖️ Political Professionals</h3>
              <p className="mt-2 text-sm text-slate-700">
                Opposition research, debate prep, messaging analysis. Identify framing tactics before 
                they gain traction. Track narrative shifts across platforms.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">🔍 Investigators & Watchdogs</h3>
              <p className="mt-2 text-sm text-slate-700">
                Disinformation tracking, propaganda pattern detection, evidence documentation. 
                Export professional briefs for reports.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">🏫 Educators</h3>
              <p className="mt-2 text-sm text-slate-700">
                Media literacy teaching tool. Show students how to separate facts from framing, 
                identify propaganda tactics, demand evidence.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">👥 General Public</h3>
              <p className="mt-2 text-sm text-slate-700">
                Check viral claims before sharing. Get plain-English explanations. Learn to spot 
                manipulation. Take concrete civic action.
              </p>
            </div>
          </div>
        </section>

        {/* Transparency */}
        <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Transparency & Limitations</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              <strong className="text-slate-900">We show our work.</strong> Every claim includes 
              sources. Every verdict includes reasoning. We separate what's proven from what's uncertain.
            </p>
            <p>
              <strong className="text-slate-900">We're not perfect.</strong> Automated analysis has 
              limits. We miss context. We can't verify everything. We make mistakes. That's why we 
              always recommend: <em>Don't trust us — check the sources yourself.</em>
            </p>
            <p>
              <strong className="text-slate-900">We're not a substitute for human judgment.</strong> 
              Use this as a starting point for investigation, not as a final answer. Professional 
              reporting still matters.
            </p>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="mt-12 rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-8 shadow-lg">
          <h2 className="text-2xl font-extrabold text-slate-900">Ready to try it?</h2>
          <p className="mt-3 text-sm text-slate-700">
            Start with Public Mode for free. Upgrade to Professional Mode for journalist-grade analysis.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/analyze"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              Try It Now
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
            >
              See Pricing
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
