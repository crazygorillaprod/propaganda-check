'use client';

export function LearnTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">How to read this</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li><span className="font-semibold">Verification status</span> tells you whether evidence retrieval ran and returned sources.</li>
          <li><span className="font-semibold">Verification score</span> is only meaningful when sources were retrieved.</li>
          <li><span className="font-semibold">Claims</span> are evaluated individually. One strong claim doesn’t validate the entire narrative.</li>
          <li><span className="font-semibold">Language risk</span> is about framing tactics, not a moral verdict.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Usage tips</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li>For best results, paste the specific claim you intend to repeat publicly.</li>
          <li>When a claim shows a number (like 50%), ask for a source and baseline measurement.</li>
          <li>Always open the sources and scan the snippet context before sharing.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Disclaimer</div>
        <p className="mt-2 text-sm text-slate-700">
          This is educational. It can help you find evidence and spot framing, but it’s not legal or professional advice.
        </p>
      </div>
    </div>
  );
}
