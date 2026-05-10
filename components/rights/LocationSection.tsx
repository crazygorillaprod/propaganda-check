"use client";

import { useState } from "react";

const resourceCategories = [
  {
    emoji: "⚖️",
    label: "Legal Aid",
    description: "Free or low-cost civil legal services",
    link: "https://www.lawhelp.org",
    linkLabel: "lawhelp.org →",
  },
  {
    emoji: "🏛️",
    label: "ACLU",
    description: "Civil liberties legal support & know your rights",
    link: "https://www.aclu.org/know-your-rights",
    linkLabel: "aclu.org →",
  },
  {
    emoji: "✊",
    label: "NAACP",
    description: "Civil rights advocacy and local chapters",
    link: "https://www.naacp.org",
    linkLabel: "naacp.org →",
  },
  {
    emoji: "🆓",
    label: "Bail Funds",
    description: "Emergency bail assistance funds",
    link: "https://www.bailfunds.org",
    linkLabel: "bailfunds.org →",
  },
  {
    emoji: "🗳️",
    label: "Vote.gov",
    description: "Voter registration and local election info",
    link: "https://www.vote.gov",
    linkLabel: "vote.gov →",
  },
  {
    emoji: "📞",
    label: "Public Defender",
    description: "If arrested, request a public defender immediately",
    link: "https://www.nlada.org/defender-resources",
    linkLabel: "nlada.org →",
  },
];

export function LocationSection() {
  const [zip, setZip] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="location" className="bg-[#1a1b1e] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Find Help Near You
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Local Legal Resources
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#a8a49c]">
          Know who to call before you need to. Locate legal aid, civil rights organizations, bail funds, and civic resources in your area.
        </p>

        {/* ZIP search */}
        <div className="mt-8 flex max-w-md gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && zip.length === 5 && setSubmitted(true)}
            placeholder="Enter your ZIP code"
            className="flex-1 rounded-xl border border-[#3a3d47] bg-[#252830] px-4 py-3.5 text-sm text-[#f5f1e8] placeholder:text-[#a8a49c] focus:border-[#c9a227]/50 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30"
          />
          <button
            type="button"
            onClick={() => zip.length === 5 && setSubmitted(true)}
            disabled={zip.length !== 5}
            className="rounded-xl bg-[#c9a227] px-5 py-3.5 text-sm font-bold text-[#1a1b1e] hover:bg-[#e8c547] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            Find
          </button>
        </div>

        {/* Resource grid - always shown (national fallback) */}
        <div className="mt-10">
          {submitted && (
            <p className="mb-5 text-sm text-[#a8a49c]">
              Showing national resources for ZIP <span className="font-bold text-[#f5f1e8]">{zip}</span> — local lookup coming soon.{" "}
              <button
                type="button"
                onClick={() => { setZip(""); setSubmitted(false); }}
                className="font-semibold text-[#c9a227] hover:underline"
              >
                Reset
              </button>
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceCategories.map((r) => (
              <a
                key={r.label}
                href={r.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4 rounded-2xl border border-[#3a3d47] bg-[#252830] p-5 hover:border-[#c9a227]/40 hover:bg-[#2e3138]"
              >
                <div className="text-3xl">{r.emoji}</div>
                <div>
                  <div className="font-bold text-[#f5f1e8]">{r.label}</div>
                  <div className="mt-1 text-sm text-[#a8a49c]">{r.description}</div>
                  <div className="mt-2 text-xs font-semibold text-[#c9a227]">{r.linkLabel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Emergency numbers */}
        <div className="mt-8 rounded-2xl border border-[#3a3d47] bg-[#252830] p-6">
          <h3 className="mb-4 text-base font-bold text-[#f5f1e8]">
            Numbers to Memorize Before You Need Them
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#1a1b1e] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#c9a227]">ACLU Hotline</div>
              <div className="mt-1 text-xl font-extrabold text-[#f5f1e8]">1-877-523-2792</div>
              <div className="mt-0.5 text-xs text-[#a8a49c]">Civil liberties intake line</div>
            </div>
            <div className="rounded-xl bg-[#1a1b1e] p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#c9a227]">Legal Aid Helpline</div>
              <div className="mt-1 text-xl font-extrabold text-[#f5f1e8]">1-800-551-5554</div>
              <div className="mt-0.5 text-xs text-[#a8a49c]">National Legal Aid Referral</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
