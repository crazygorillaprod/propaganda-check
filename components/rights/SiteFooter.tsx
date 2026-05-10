export function SiteFooter() {
  return (
    <footer className="border-t border-[#3a3d47] bg-[#1a1b1e]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="sm:col-span-1">
            <div className="text-lg font-extrabold text-[#f5f1e8]">Know Your Rights</div>
            <div className="mt-0.5 text-sm font-semibold text-[#c9a227]">by BFM Breakdown</div>
            <p className="mt-3 text-sm leading-relaxed text-[#a8a49c]">
              Constitutional literacy. Civic education. Legal preparedness. Community empowerment.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#a8a49c]">
              Navigate
            </div>
            <nav className="flex flex-col gap-2">
              <a href="#emergency" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Emergency Mode
              </a>
              <a href="#rights" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Your Rights
              </a>
              <a href="#search" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Search Legal Questions
              </a>
              <a href="#location" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Find Local Resources
              </a>
              <a href="#civic" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Civic Power
              </a>
              <a href="#downloads" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Downloads
              </a>
              <a href="#membership" className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]">
                Membership
              </a>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#a8a49c]">
              External Resources
            </div>
            <nav className="flex flex-col gap-2">
              <a
                href="https://www.aclu.org/know-your-rights"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]"
              >
                ACLU Know Your Rights
              </a>
              <a
                href="https://www.lawhelp.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]"
              >
                Legal Aid Near You
              </a>
              <a
                href="https://www.naacpldf.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]"
              >
                NAACP Legal Defense Fund
              </a>
              <a
                href="https://www.bailfunds.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]"
              >
                National Bail Fund Network
              </a>
              <a
                href="https://bfmbreakdown.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#f5f1e8] hover:text-[#c9a227]"
              >
                BFM Breakdown Substack
              </a>
            </nav>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 border-t border-[#3a3d47] pt-8">
          <p className="text-xs leading-relaxed text-[#a8a49c]">
            <span className="font-bold text-[#f5f1e8]">Legal Disclaimer:</span> This platform provides constitutional education and civic information — it does not constitute legal advice and does not create an attorney-client relationship. Laws vary by state and jurisdiction. For your specific legal situation, consult a licensed attorney. If you cannot afford an attorney, contact your local legal aid society or public defender's office.
          </p>
          <p className="mt-4 text-xs text-[#a8a49c]">
            © {new Date().getFullYear()} BFM Breakdown. Know Your Rights. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
