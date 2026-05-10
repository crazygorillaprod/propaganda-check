"use client";

import { useState, useMemo } from "react";
import { searchData } from "@/lib/rights-search-data";

const exampleQueries = [
  "Can police search my car?",
  "Do I have to show ID?",
  "Can police take my phone?",
  "Can I record police?",
  "What are Miranda rights?",
  "What is qualified immunity?",
];

export function SearchSection() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(() => {
    if (!submitted.trim()) return [];
    const lower = submitted.toLowerCase();
    return searchData.filter(
      (item) =>
        item.question.toLowerCase().includes(lower) ||
        item.answer.toLowerCase().includes(lower) ||
        item.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }, [submitted]);

  function handleSearch() {
    setSubmitted(query.trim());
  }

  return (
    <section
      id="search"
      className="bg-[#252830] px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[#c9a227]">
          Legal Knowledge Base
        </div>
        <h2 className="text-3xl font-extrabold text-[#f5f1e8] sm:text-4xl">
          Ask a Legal Question
        </h2>
        <p className="mt-3 text-base text-[#a8a49c]">
          Plain-English answers to your most pressing legal questions.
        </p>

        {/* Search bar */}
        <div className="mt-8 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Can police search my car without a warrant?"
            className="flex-1 rounded-xl border border-[#3a3d47] bg-[#1a1b1e] px-4 py-3.5 text-sm text-[#f5f1e8] placeholder:text-[#a8a49c] focus:border-[#c9a227]/50 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/30"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-xl bg-[#c9a227] px-5 py-3.5 text-sm font-bold text-[#1a1b1e] hover:bg-[#e8c547] active:scale-95"
          >
            Search
          </button>
        </div>

        {/* Example queries */}
        {!submitted && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-[#a8a49c]">Try searching:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    setSubmitted(q);
                  }}
                  className="rounded-lg border border-[#3a3d47] bg-[#1a1b1e] px-3 py-1.5 text-xs font-medium text-[#f5f1e8] hover:border-[#c9a227]/40 hover:text-[#c9a227]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {submitted && (
          <div className="mt-8">
            {results.length === 0 ? (
              <div className="rounded-xl border border-[#3a3d47] bg-[#1a1b1e] p-6 text-center">
                <p className="text-sm text-[#a8a49c]">
                  No results found for "{submitted}". Try different keywords, or{" "}
                  <a href="#membership" className="font-semibold text-[#c9a227] hover:underline">
                    speak with a legal expert
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSubmitted(""); }}
                  className="mt-3 text-xs font-semibold text-[#a8a49c] hover:text-[#f5f1e8]"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#a8a49c]">
                  {results.length} result{results.length !== 1 ? "s" : ""} for "{submitted}"
                  {" · "}
                  <button
                    type="button"
                    onClick={() => { setQuery(""); setSubmitted(""); }}
                    className="font-semibold text-[#c9a227] hover:underline"
                  >
                    Clear
                  </button>
                </p>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#3a3d47] bg-[#1a1b1e] p-5"
                  >
                    <h3 className="text-base font-bold text-[#f5f1e8]">{r.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#a8a49c]">{r.answer}</p>
                    {(r.amendment || r.caselaw) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.amendment && (
                          <span className="rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-3 py-1 text-xs font-bold text-[#c9a227]">
                            {r.amendment}
                          </span>
                        )}
                        {r.caselaw && (
                          <span className="rounded-full border border-[#3a3d47] bg-[#252830] px-3 py-1 text-xs font-medium text-[#a8a49c]">
                            {r.caselaw}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
