'use client';

export function LearnTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">How to read this</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li><span className="font-semibold">Verification status</span> shows whether we pulled outside sources.</li>
          <li><span className="font-semibold">Claims</span> are statements made in the article (or by a public figure). We check them one by one.</li>
          <li><span className="font-semibold">Sources</span> show where the facts come from. Open them and read the context.</li>
          <li><span className="font-semibold">Language risk</span> shows possible spin tactics (framing, loaded wording). It’s not a moral verdict.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Usage tips</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
          <li>For best results, paste the exact statement you saw online or heard in a clip.</li>
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
