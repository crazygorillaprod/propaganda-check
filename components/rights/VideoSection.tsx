const videos = [
  {
    id: "v1",
    title: "What NOT to Say During a Police Stop",
    duration: "8 min",
    type: "deep-dive",
    description: "The exact phrases that have sent innocent people to prison — and what to say instead.",
    tags: ["traffic stop", "silence", "5th amendment"],
  },
  {
    id: "v2",
    title: "What Probable Cause Actually Means",
    duration: "6 min",
    type: "deep-dive",
    description: "The legal standard police must meet before they can search you, arrest you, or enter your home.",
    tags: ["probable cause", "4th amendment", "search"],
  },
  {
    id: "v3",
    title: "Why You Should Never Consent to Searches",
    duration: "5 min",
    type: "explainer",
    description: "The counterintuitive truth: consenting to a search has almost no upside — even if you have nothing to hide.",
    tags: ["search", "consent", "4th amendment"],
  },
  {
    id: "v4",
    title: "How Qualified Immunity Works",
    duration: "10 min",
    type: "deep-dive",
    description: "The legal doctrine that makes it nearly impossible to sue police — and the movement to change it.",
    tags: ["qualified immunity", "civil rights", "accountability"],
  },
  {
    id: "v5",
    title: "Your Right to Record Police",
    duration: "4 min",
    type: "explainer",
    description: "The First Amendment protects it. What to say when officers tell you to stop filming.",
    tags: ["recording", "1st amendment", "public space"],
  },
  {
    id: "v6",
    title: "Understanding Miranda Rights",
    duration: "7 min",
    type: "deep-dive",
    description: "When they apply, when they don't, and the critical Berghuis ruling that changed everything.",
    tags: ["miranda", "5th amendment", "arrest"],
  },
];

const typeColors: Record<string, string> = {
  "explainer": "bg-[#c9a227]/15 text-[#c9a227] border-[#c9a227]/30",
  "deep-dive": "bg-[#252830] text-[#a8a49c] border-[#3a3d47]",
};

const typeLabels: Record<string, string> = {
  "explainer": "Explainer",
  "deep-dive": "Deep Dive",
};

export function VideoSection() {
  return (
    <section id="videos" className="bg-[#1a1b1e] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          BFM Breakdown Video Library
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Watch. Learn. Remember.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          Short-form explainers and deep dives from BFM Breakdown — plain language, legally grounded, built for people who need to understand this now.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group flex flex-col rounded-2xl border border-[#3a3d47] bg-[#252830] overflow-hidden hover:border-[#c9a227]/30"
            >
              {/* Video thumbnail placeholder */}
              <div className="relative flex h-40 items-center justify-center bg-[#1a1b1e]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c9a227]/50 bg-[#c9a227]/10 group-hover:border-[#c9a227] group-hover:bg-[#c9a227]/20">
                  <svg className="h-6 w-6 text-[#c9a227]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white">
                  {v.duration}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${typeColors[v.type]}`}
                  >
                    {typeLabels[v.type]}
                  </span>
                </div>
                <h3 className="text-sm font-bold leading-snug text-[#f5f1e8]">{v.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-[#a8a49c]">{v.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {v.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#1a1b1e] px-2.5 py-0.5 text-xs text-[#a8a49c]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://bfmbreakdown.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[#c9a227]/40 bg-[#c9a227]/10 px-6 py-3 text-sm font-bold text-[#c9a227] hover:bg-[#c9a227]/20"
          >
            Full Video Library at BFM Breakdown →
          </a>
        </div>
      </div>
    </section>
  );
}
