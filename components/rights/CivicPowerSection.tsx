const positions = [
  {
    role: "District Attorney",
    controls: "Decides what crimes to charge, whether to prosecute, and plea deals. Has enormous discretionary power over who faces prison.",
    elected: true,
    frequency: "Every 4 years",
  },
  {
    role: "Sheriff",
    controls: "Runs the county jail and county law enforcement. Oversees deputy training and use-of-force policies.",
    elected: true,
    frequency: "Every 4 years",
  },
  {
    role: "Mayor",
    controls: "Appoints the police chief. Sets the policing budget. Controls the policy direction of city police departments.",
    elected: true,
    frequency: "Every 2–4 years",
  },
  {
    role: "Governor",
    controls: "Commands state police. Can issue pardons and commutations. Appoints state judges and corrections leaders.",
    elected: true,
    frequency: "Every 4 years",
  },
  {
    role: "Judges",
    controls: "Set bail, sentence defendants, rule on suppression of evidence, and interpret your constitutional rights.",
    elected: true,
    frequency: "Varies by state — many are elected",
  },
  {
    role: "City Council",
    controls: "Approves the police budget. Can create or dissolve civilian oversight boards. Controls local ordinances.",
    elected: true,
    frequency: "Every 2–4 years",
  },
];

export function CivicPowerSection() {
  return (
    <section id="civic" className="bg-[#252830] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Civic Power
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Who Controls What
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          Fear turns into power the moment you understand who makes the rules — and that most of them answer to you at the ballot box.
        </p>

        {/* Desktop table */}
        <div className="mt-10 hidden overflow-hidden rounded-2xl border border-[#3a3d47] sm:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#3a3d47] bg-[#1a1b1e]">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                  What They Control
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                  Elected?
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                  How Often
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr
                  key={p.role}
                  className={`border-b border-[#3a3d47] ${i % 2 === 0 ? "bg-[#252830]" : "bg-[#2e3138]"}`}
                >
                  <td className="px-6 py-4 text-sm font-bold text-[#f5f1e8]">{p.role}</td>
                  <td className="px-6 py-4 text-sm leading-relaxed text-[#a8a49c]">{p.controls}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-400">
                    {p.elected ? "✓ Yes" : "No"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#a8a49c]">{p.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-8 space-y-4 sm:hidden">
          {positions.map((p) => (
            <div
              key={p.role}
              className="rounded-2xl border border-[#3a3d47] bg-[#1a1b1e] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-[#f5f1e8]">{p.role}</h3>
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                  Elected
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#a8a49c]">{p.controls}</p>
              <p className="mt-2 text-xs font-semibold text-[#c9a227]">Election cycle: {p.frequency}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <a
            href="https://www.vote.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[#3a3d47] bg-[#1a1b1e] p-4 hover:border-[#c9a227]/40"
          >
            <span className="text-2xl">🗳️</span>
            <div>
              <div className="text-sm font-bold text-[#f5f1e8]">Register to Vote</div>
              <div className="text-xs text-[#a8a49c]">vote.gov</div>
            </div>
          </a>
          <a
            href="https://www.commoncause.org/find-your-representative"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[#3a3d47] bg-[#1a1b1e] p-4 hover:border-[#c9a227]/40"
          >
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="text-sm font-bold text-[#f5f1e8]">Find Representatives</div>
              <div className="text-xs text-[#a8a49c]">commoncause.org</div>
            </div>
          </a>
          <a
            href="https://www.usa.gov/election-office"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[#3a3d47] bg-[#1a1b1e] p-4 hover:border-[#c9a227]/40"
          >
            <span className="text-2xl">📅</span>
            <div>
              <div className="text-sm font-bold text-[#f5f1e8]">Local Election Dates</div>
              <div className="text-xs text-[#a8a49c]">usa.gov</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
