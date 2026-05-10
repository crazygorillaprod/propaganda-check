import { notFound } from "next/navigation";
import Link from "next/link";
import { encounterScripts, encounterList } from "@/lib/encounter-scripts";

export function generateStaticParams() {
  return encounterList.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const script = encounterScripts[slug];
  if (!script) return {};
  return {
    title: `${script.title} — Know Your Rights`,
    description: `Exact script and rights guide for: ${script.shortDesc}`,
  };
}

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const script = encounterScripts[slug];

  if (!script) notFound();

  return (
    <main className="min-h-screen bg-[#1a1b1e] text-[#f5f1e8]">
      {/* Emergency header bar */}
      <div className="bg-[#991b1b] px-4 py-2 text-center text-sm font-bold text-white">
        🚨 STAY CALM · SPEAK SLOWLY · HANDS VISIBLE
      </div>

      {/* Back nav */}
      <div className="border-b border-[#3a3d47] bg-[#1a1b1e] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/#emergency"
            className="flex items-center gap-2 text-sm font-semibold text-[#a8a49c] hover:text-[#f5f1e8]"
          >
            ← Back to all scenarios
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-[#c9a227]">
            Emergency Script
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Title */}
        <div className="mb-8">
          <div className="mb-1 text-4xl">{script.emoji}</div>
          <h1 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
            {script.title}
          </h1>
          <p className="mt-2 text-base text-[#a8a49c]">{script.shortDesc}</p>

          {/* Rights involved */}
          <div className="mt-4 flex flex-wrap gap-2">
            {script.rights.map((r) => (
              <span
                key={r}
                className="rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-3 py-1 text-xs font-bold text-[#c9a227]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mb-10">
          <h2 className="mb-5 text-lg font-extrabold uppercase tracking-wider text-[#f5f1e8]">
            Step by Step
          </h2>
          <div className="space-y-4">
            {script.steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#3a3d47] bg-[#252830] p-5"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c9a227] text-sm font-extrabold text-[#1a1b1e]">
                    {step.number}
                  </div>
                  <h3 className="text-base font-bold text-[#f5f1e8]">{step.heading}</h3>
                </div>

                {step.detail && (
                  <p className="ml-11 text-sm text-[#a8a49c]">{step.detail}</p>
                )}

                {step.script && (
                  <div className="ml-11 mt-3 rounded-xl border-l-4 border-[#c9a227] bg-[#1a1b1e] p-4">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                      Say exactly:
                    </div>
                    <p className="text-base font-semibold leading-relaxed text-[#f5f1e8]">
                      "{step.script}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What NOT to do */}
        <div className="mb-10 rounded-2xl border border-[#b91c1c]/40 bg-[#b91c1c]/10 p-6">
          <h2 className="mb-4 text-lg font-extrabold uppercase tracking-wider text-red-300">
            What NOT to Do
          </h2>
          <ul className="space-y-2.5">
            {script.doNots.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-red-200">
                <span className="mt-0.5 shrink-0 font-bold text-red-400">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rights explanation */}
        <div className="mb-10 rounded-2xl border border-[#3a3d47] bg-[#252830] p-6">
          <h2 className="mb-3 text-lg font-extrabold uppercase tracking-wider text-[#f5f1e8]">
            Why These Rights Apply
          </h2>
          <p className="text-sm leading-relaxed text-[#a8a49c]">{script.rightsExplanation}</p>
        </div>

        {/* State notes */}
        <div className="mb-10 rounded-2xl border border-[#c9a227]/20 bg-[#c9a227]/5 p-6">
          <h2 className="mb-3 text-lg font-extrabold uppercase tracking-wider text-[#c9a227]">
            State-Specific Notes
          </h2>
          <p className="text-sm leading-relaxed text-[#a8a49c]">{script.stateNotes}</p>
        </div>

        {/* After the encounter */}
        <div className="mb-10 rounded-2xl border border-[#3a3d47] bg-[#252830] p-6">
          <h2 className="mb-3 text-lg font-extrabold uppercase tracking-wider text-[#f5f1e8]">
            After the Encounter
          </h2>
          <ul className="space-y-2.5 text-sm text-[#a8a49c]">
            <li className="flex gap-3">
              <span className="shrink-0 text-[#c9a227]">1.</span>
              <span>Write down everything immediately — officer's name, badge number, car number, exact words spoken, time, location, witnesses.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-[#c9a227]">2.</span>
              <span>Save any video footage. Back it up to the cloud immediately.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-[#c9a227]">3.</span>
              <span>If your rights were violated, contact the ACLU, a civil rights attorney, or file a complaint with the police department's internal affairs.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-[#c9a227]">4.</span>
              <span>If injured, seek medical attention and document injuries with photographs.</span>
            </li>
          </ul>
        </div>

        {/* Other scenarios */}
        <div>
          <h2 className="mb-4 text-base font-bold text-[#a8a49c]">Other Scenarios</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {encounterList
              .filter((e) => e.slug !== slug)
              .map((e) => (
                <Link
                  key={e.slug}
                  href={`/encounter/${e.slug}`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#3a3d47] bg-[#252830] p-4 text-center hover:border-[#c9a227]/40"
                >
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-xs font-semibold text-[#f5f1e8]">{e.title}</span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
