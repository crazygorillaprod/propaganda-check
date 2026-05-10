const amendments = [
  {
    number: "4th",
    name: "Search & Seizure",
    plain: "Protection from unreasonable searches and seizures of your person, home, car, and belongings.",
    realLife: "Police cannot search your car, home, or person without your consent, a warrant, or probable cause.",
    tactic: "\"Consent searches\" — asking nicely, hoping you say yes. Always say: I do not consent to searches.",
    ruling: "Riley v. California (2014): Police need a warrant to search your phone.",
  },
  {
    number: "5th",
    name: "Right to Silence",
    plain: "You cannot be forced to testify against yourself. You have the right to remain silent.",
    realLife: "You do not have to answer police questions. Not about where you've been, what you're doing, or anything else.",
    tactic: "\"Just talk to us — if you have nothing to hide...\" This is manipulation. Innocent people go to prison from talking.",
    ruling: "Berghuis v. Thompkins (2010): You must explicitly invoke silence by saying 'I invoke my right to remain silent.'",
  },
  {
    number: "6th",
    name: "Right to an Attorney",
    plain: "You have the right to an attorney in all criminal proceedings. If you cannot afford one, the state must provide one.",
    realLife: "Ask for an attorney immediately. Say nothing until one is present. This applies whether you're guilty or innocent.",
    tactic: "\"If you lawyer up, it'll look bad.\" This is false. Invoking your right to counsel cannot be used against you.",
    ruling: "Gideon v. Wainwright (1963): Established the right to appointed counsel for everyone.",
  },
  {
    number: "1st",
    name: "Right to Record",
    plain: "The First Amendment protects your right to record police performing their duties in public spaces.",
    realLife: "You can record police openly in public. You do not need to hide it or have their permission.",
    tactic: "\"Turn that off\" or \"You'll interfere with our investigation.\" Simply being nearby and recording is not interference.",
    ruling: "All federal circuit courts have affirmed the First Amendment right to record police in public.",
  },
  {
    number: "14th",
    name: "Equal Protection",
    plain: "No state shall deny any person equal protection of the laws. Racially discriminatory policing is unconstitutional.",
    realLife: "If you are stopped, searched, or treated differently because of your race, that may constitute a civil rights violation.",
    tactic: "Race-neutral pretexts for racially motivated stops — 'failure to signal,' 'looking suspicious,' etc.",
    ruling: "Floyd v. City of New York (2013): NYC's stop-and-frisk program was found unconstitutional racial profiling.",
  },
];

export function RightsCardsSection() {
  return (
    <section id="rights" className="bg-[#1a1b1e] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Constitutional Rights
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Your Rights in Plain English
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          Not what politicians say your rights are. What the Constitution actually says — and what courts have ruled.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {amendments.map((a) => (
            <div
              key={a.number}
              className="flex flex-col rounded-2xl border border-[#3a3d47] bg-[#252830] p-6"
            >
              {/* Amendment number */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#c9a227]/15 text-lg font-extrabold text-[#c9a227]">
                  {a.number}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#c9a227]">
                    Amendment
                  </div>
                  <div className="text-base font-bold text-[#f5f1e8]">{a.name}</div>
                </div>
              </div>

              {/* Plain English */}
              <p className="text-sm leading-relaxed text-[#f5f1e8]">{a.plain}</p>

              {/* What this means */}
              <div className="mt-4 rounded-xl bg-[#1a1b1e] p-3">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#c9a227]">
                  What This Means
                </div>
                <p className="text-xs leading-relaxed text-[#a8a49c]">{a.realLife}</p>
              </div>

              {/* Common tactic */}
              <div className="mt-3 rounded-xl border border-[#b91c1c]/30 bg-[#b91c1c]/10 p-3">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-red-400">
                  Common Tactic
                </div>
                <p className="text-xs leading-relaxed text-red-200">{a.tactic}</p>
              </div>

              {/* Court ruling */}
              <div className="mt-3 text-xs text-[#a8a49c]">
                <span className="font-semibold text-[#f5f1e8]">Court ruling: </span>
                {a.ruling}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
