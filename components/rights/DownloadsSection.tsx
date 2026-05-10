const downloads = [
  {
    emoji: "💳",
    title: "Wallet Rights Card",
    description: "Printable 3×4\" card: what to say, what not to say, emergency numbers.",
    format: "PDF · Print-ready",
    comingSoon: false,
  },
  {
    emoji: "📱",
    title: "Phone Lock Screen",
    description: "Set this as your lock screen: \"I invoke my right to remain silent. I want an attorney.\"",
    format: "PNG · 1080×2340",
    comingSoon: false,
  },
  {
    emoji: "📄",
    title: "Full Rights Guide",
    description: "The complete Know Your Rights guide — all amendments, scripts, and state notes.",
    format: "PDF · 28 pages",
    comingSoon: false,
  },
  {
    emoji: "🎙️",
    title: "Encounter Scripts",
    description: "Every encounter type with exact word-for-word scripts you can read under stress.",
    format: "PDF · Printable",
    comingSoon: false,
  },
  {
    emoji: "📋",
    title: "Incident Report Template",
    description: "Fill out immediately after any encounter. Captures the details that matter in court.",
    format: "PDF · Fill-in form",
    comingSoon: false,
  },
  {
    emoji: "📞",
    title: "Emergency Contact Card",
    description: "Attorney, bail fund, trusted contact. Memorize it. Keep it in your wallet.",
    format: "PDF · Print-ready",
    comingSoon: false,
  },
];

export function DownloadsSection() {
  return (
    <section id="downloads" className="bg-[#252830] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Practical Downloads
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Carry Your Rights With You
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          Free downloads designed for real situations. Print them. Set them as your lock screen. Keep them in your wallet.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {downloads.map((d) => (
            <div
              key={d.title}
              className="flex flex-col rounded-2xl border border-[#3a3d47] bg-[#1a1b1e] p-5"
            >
              <div className="mb-3 text-3xl">{d.emoji}</div>
              <h3 className="text-base font-bold text-[#f5f1e8]">{d.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#a8a49c]">{d.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-[#a8a49c]">{d.format}</span>
                <button
                  type="button"
                  className="rounded-lg bg-[#c9a227] px-4 py-2 text-xs font-bold text-[#1a1b1e] hover:bg-[#e8c547] active:scale-95"
                >
                  Download →
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[#a8a49c]">
          All resources are free. No email required.
        </p>
      </div>
    </section>
  );
}
