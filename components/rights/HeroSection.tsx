import Link from "next/link";

const ctaButtons = [
  { href: "#emergency", label: "I'm Being Stopped", emoji: "🚨", primary: true },
  { href: "#rights", label: "Know My Rights", emoji: "⚖️", primary: false },
  { href: "#search", label: "Search Legal Questions", emoji: "🔍", primary: false },
  { href: "#civic", label: "Find My Officials", emoji: "🗳️", primary: false },
  { href: "#membership", label: "Get Legal Help", emoji: "🆘", primary: false },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a1b1e] px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #f5f1e8 0px, #f5f1e8 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #f5f1e8 0px, #f5f1e8 1px, transparent 1px, transparent 60px)",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#c9a227]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#c9a227]">
            Constitutional Literacy · Civic Education · Legal Preparedness
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl font-extrabold leading-none tracking-tight text-[#f5f1e8] sm:text-7xl lg:text-8xl">
          KNOW YOUR
          <br />
          <span className="text-[#c9a227]">RIGHTS.</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-[#a8a49c] sm:text-xl">
          A Practical Legal & Civic Survival Guide for Black Men in America.
        </p>
        <p className="mt-3 max-w-xl text-base font-semibold text-[#f5f1e8]/80 sm:text-lg">
          "Know what to say. Know what not to say. Know how to protect yourself."
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap gap-3">
          {ctaButtons.map((btn) =>
            btn.primary ? (
              <a
                key={btn.href}
                href={btn.href}
                className="flex items-center gap-2 rounded-xl bg-[#b91c1c] px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-900/30 hover:bg-[#991b1b] active:scale-95"
              >
                <span>{btn.emoji}</span>
                <span>{btn.label}</span>
              </a>
            ) : (
              <a
                key={btn.href}
                href={btn.href}
                className="flex items-center gap-2 rounded-xl border border-[#3a3d47] bg-[#252830] px-5 py-4 text-base font-semibold text-[#f5f1e8] hover:border-[#c9a227]/50 hover:bg-[#2e3138] active:scale-95"
              >
                <span>{btn.emoji}</span>
                <span>{btn.label}</span>
              </a>
            )
          )}
        </div>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#3a3d47] pt-8">
          <div className="text-sm text-[#a8a49c]">
            <span className="font-semibold text-[#f5f1e8]">Constitutional</span> — grounded in U.S. law
          </div>
          <div className="text-sm text-[#a8a49c]">
            <span className="font-semibold text-[#f5f1e8]">Plain English</span> — no legal jargon
          </div>
          <div className="text-sm text-[#a8a49c]">
            <span className="font-semibold text-[#f5f1e8]">Mobile Optimized</span> — use during encounters
          </div>
          <div className="text-sm text-[#a8a49c]">
            <span className="font-semibold text-[#f5f1e8]">Not legal advice</span> — know the difference
          </div>
        </div>
      </div>
    </section>
  );
}
