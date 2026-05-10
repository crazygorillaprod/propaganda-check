"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#3a3d47] bg-[#1a1b1e]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight text-[#f5f1e8]">
            Know Your Rights
          </span>
          <span className="hidden rounded bg-[#c9a227] px-2 py-0.5 text-xs font-bold text-[#1a1b1e] sm:inline">
            BFM Breakdown
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#emergency"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
          >
            Emergency
          </a>
          <a
            href="#rights"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
          >
            Your Rights
          </a>
          <a
            href="#search"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
          >
            Search
          </a>
          <a
            href="#civic"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
          >
            Civic Power
          </a>
          <a
            href="#membership"
            className="ml-2 rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-[#1a1b1e] hover:bg-[#e8c547]"
          >
            Get Legal Help
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-lg p-2 text-[#f5f1e8] hover:bg-[#252830] md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[#3a3d47] bg-[#1a1b1e] px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            <a
              href="#emergency"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
            >
              🚨 Emergency Mode
            </a>
            <a
              href="#rights"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
            >
              ⚖️ Your Rights
            </a>
            <a
              href="#search"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
            >
              🔍 Search
            </a>
            <a
              href="#civic"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#f5f1e8] hover:bg-[#252830]"
            >
              🗳️ Civic Power
            </a>
            <a
              href="#membership"
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-lg bg-[#c9a227] px-3 py-2.5 text-sm font-bold text-[#1a1b1e]"
            >
              🆘 Get Legal Help
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
