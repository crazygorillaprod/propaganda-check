'use client';

import { useId } from 'react';

type AnalyzeFormProps = {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AnalyzeForm({ value, onChange, onAnalyze, onClear, disabled, loading }: AnalyzeFormProps) {
  const id = useId();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <label htmlFor={id} className="block">
        <div className="mb-2 text-sm font-semibold text-slate-900">Text or URL</div>
        <textarea
          id={id}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste an article URL, excerpt, or social media post here…"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled || loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Tip: Start with a single, checkable claim or paste a URL.
      </p>
    </section>
  );
}
