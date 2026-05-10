const freeFeatures = [
  "Complete constitutional rights guide",
  "All 6 encounter scripts",
  "Legal knowledge search base",
  "Printable wallet cards & lock screens",
  "Civic power guide",
  "National resource directory",
];

const paidFeatures = [
  "Everything in Free",
  "State-by-state legal differences (all 50 states)",
  "Deep legal explainers with case law breakdowns",
  "Live emergency legal webinars",
  "Community member forum & chats",
  "What to do after arrest (bail → arraignment → expungement)",
  "Workplace rights & discrimination guide",
  "Youth & school rights guide",
  "Rapid-response news analysis",
  "Priority access to legal aid referrals",
];

export function MembershipSection() {
  return (
    <section id="membership" className="bg-[#1a1b1e] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Membership
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Go Deeper. Stay Ready.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          The core guide is free — always. Membership supports deeper research, state-specific law, and community for those who want more.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Free tier */}
          <div className="flex flex-col rounded-2xl border border-[#3a3d47] bg-[#252830] p-7">
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-[#a8a49c]">
              Free — Always
            </div>
            <div className="text-4xl font-extrabold text-[#f5f1e8]">$0</div>
            <div className="mt-1 text-sm text-[#a8a49c]">No credit card. No email required.</div>

            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#f5f1e8]">
                  <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="#rights"
              className="mt-8 flex items-center justify-center rounded-xl border border-[#3a3d47] bg-[#1a1b1e] px-6 py-3.5 text-sm font-bold text-[#f5f1e8] hover:bg-[#252830]"
            >
              Start Reading — Free
            </a>
          </div>

          {/* Paid tier */}
          <div className="relative flex flex-col rounded-2xl border-2 border-[#c9a227]/50 bg-[#252830] p-7">
            <div className="absolute -top-3 left-6 rounded-full bg-[#c9a227] px-3 py-1 text-xs font-bold text-[#1a1b1e]">
              RECOMMENDED
            </div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-[#c9a227]">
              Member
            </div>
            <div className="text-4xl font-extrabold text-[#f5f1e8]">$10</div>
            <div className="mt-1 text-sm text-[#a8a49c]">per month · cancel anytime</div>

            <ul className="mt-6 flex-1 space-y-3">
              {paidFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#f5f1e8]">
                  <span className="mt-0.5 shrink-0 text-[#c9a227]">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://bfmbreakdown.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center justify-center rounded-xl bg-[#c9a227] px-6 py-3.5 text-sm font-bold text-[#1a1b1e] hover:bg-[#e8c547] active:scale-95"
            >
              Become a Member →
            </a>
          </div>
        </div>

        {/* Emergency legal help CTA */}
        <div className="mt-10 rounded-2xl border border-[#b91c1c]/30 bg-[#b91c1c]/10 p-6">
          <h3 className="text-lg font-bold text-[#f5f1e8]">
            🆘 Need Legal Help Right Now?
          </h3>
          <p className="mt-2 text-sm text-red-200">
            If you or someone you know is currently in a legal emergency, do not wait. Contact these resources immediately.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://www.aclu.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"
            >
              ACLU →
            </a>
            <a
              href="https://www.lawhelp.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"
            >
              Legal Aid →
            </a>
            <a
              href="https://www.naacpldf.org"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"
            >
              NAACP Legal Defense Fund →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
