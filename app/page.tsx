'use client';

import { useState } from 'react';
import type { RecommendationResult } from '@/lib/advisor';
import { getBuildSpec } from '@/lib/buildspec';

const EXAMPLES = [
  'autonomous back-office for restaurants',
  'extract fields from invoices',
  'realtime voice agent for phone calls',
];

const REC_LABELS: Record<string, string> = {
  managed_agents: 'Managed Agents',
  messages_api: 'Messages API',
  not_claude_first: 'Not Claude-first',
};

const REC_COLORS: Record<string, string> = {
  managed_agents: 'text-violet-700',
  messages_api: 'text-orange-700',
  not_claude_first: 'text-stone-700',
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-red-50 text-red-700 border-red-200',
};

const SIGNAL_ORDER = [
  'horizon',
  'autonomy',
  'tool_use',
  'durability',
  'auditability',
  'latency',
  'state',
] as const;

export default function Home() {
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deeperCopied, setDeeperCopied] = useState(false);
  const [goDeeper, setGoDeeper] = useState(false);
  const [submittedUseCase, setSubmittedUseCase] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!useCase.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setGoDeeper(false);
    setSubmittedUseCase(useCase.trim());

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase: useCase.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.');
      } else {
        setResult(data as RecommendationResult);
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  async function copyBuildSpec() {
    await navigator.clipboard.writeText(getBuildSpec(submittedUseCase));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const deeperPrompt = result
    ? `I'm building: ${submittedUseCase}\n\nI've been recommended to use ${REC_LABELS[result.recommendation]} on the Anthropic platform.\n\nHelp me:\n1. Design the high-level architecture for this specific use case\n2. Identify the key edge cases and failure modes\n3. Estimate rough API cost and latency tradeoffs\n4. Write a minimal working prototype`
    : '';

  async function copyDeeperPrompt() {
    await navigator.clipboard.writeText(deeperPrompt);
    setDeeperCopied(true);
    setTimeout(() => setDeeperCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#f0eee7]">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-mono text-stone-400 mb-5 tracking-widest uppercase">
            claude-fit
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-stone-900">
            When NOT to build on Claude
            <br />
            <span className="text-stone-400">(and when you absolutely should)</span>
          </h1>
          <p className="mt-6 text-stone-600 leading-relaxed">
            Describe what you&apos;re building — get an honest recommendation for which
            Claude Developer Platform primitive fits, or whether to start somewhere else.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you're building, in a sentence or two"
            rows={3}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 text-sm leading-relaxed shadow-sm transition-all"
          />

          {/* Example chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setUseCase(ex)}
                className="text-xs px-3 py-1.5 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600 hover:text-stone-900 rounded-full shadow-sm transition-all"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !useCase.trim()}
            className="mt-4 w-full py-3 bg-[#ca633f] hover:bg-[#b5592e] active:bg-[#a04f28] text-white font-medium rounded-xl text-sm tracking-tight transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? 'Analyzing…' : 'Get recommendation'}
          </button>
          <p className="mt-2 text-center text-xs text-stone-400">⌘↵ to submit</p>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="mt-10 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">

            {/* Recommendation header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-2">
                  Recommendation
                </p>
                <p className={`text-2xl font-semibold tracking-tight ${REC_COLORS[result.recommendation]}`}>
                  {REC_LABELS[result.recommendation]}
                </p>
              </div>
              <span
                className={`mt-1 shrink-0 text-xs font-mono px-2.5 py-1 rounded-full border ${CONFIDENCE_BADGE[result.confidence]}`}
              >
                {result.confidence} confidence
              </span>
            </div>

            {/* Signal breakdown */}
            <div className="px-6 py-5 border-b border-stone-100">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-4">
                Signal breakdown
              </p>
              <div className="space-y-2.5">
                {SIGNAL_ORDER.map((key) => (
                  <div key={key} className="flex gap-4 text-sm">
                    <span className="font-mono text-stone-400 w-24 shrink-0">{key}</span>
                    <span className="text-stone-700">{result.signals[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasoning */}
            <div className="px-6 py-5 border-b border-stone-100">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">
                Reasoning
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">{result.reasoning}</p>
            </div>

            {/* CTA */}
            <div className="px-6 py-5">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-4">
                Next step
              </p>

              {result.recommendation === 'managed_agents' && (
                <div>
                  <p className="text-sm text-stone-700 leading-relaxed mb-5">{result.next_step}</p>
                  <a
                    href="https://github.com/anthropics/launch-your-agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ca633f] hover:bg-[#b5592e] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    Start with launch-your-agent →
                  </a>
                </div>
              )}

              {result.recommendation === 'messages_api' && (
                <div>
                  <p className="text-sm text-stone-700 leading-relaxed mb-5">{result.next_step}</p>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden mb-4">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200">
                      <span className="text-xs font-mono text-stone-500">
                        Messages API build spec — paste into Claude
                      </span>
                      <button
                        onClick={copyBuildSpec}
                        className="text-xs px-2.5 py-1 bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 rounded-md transition-all font-mono shadow-sm"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="px-4 py-4 text-xs text-stone-600 whitespace-pre-wrap leading-relaxed">
                      {getBuildSpec(submittedUseCase)}
                    </pre>
                  </div>
                  <p className="text-xs text-stone-500">
                    Or grab working code:{' '}
                    <code className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-xs">
                      starters/messages_api/main.py
                    </code>
                  </p>
                </div>
              )}

              {result.recommendation === 'not_claude_first' && (
                <p className="text-sm text-stone-700 leading-relaxed">{result.next_step}</p>
              )}
            </div>

            {/* Go deeper (Claude routes only) */}
            {result.recommendation !== 'not_claude_first' && (
              <div className="border-t border-stone-100">
                <button
                  onClick={() => setGoDeeper(!goDeeper)}
                  className="w-full px-6 py-4 flex items-center justify-between text-sm text-stone-500 hover:text-stone-800 transition-colors"
                >
                  <span>Go deeper on your pattern</span>
                  <span className="font-mono text-base leading-none text-stone-400">
                    {goDeeper ? '−' : '+'}
                  </span>
                </button>
                {goDeeper && (
                  <div className="px-6 pb-6">
                    <p className="text-xs text-stone-500 mb-3">
                      Research prompt — paste into Claude for a tailored deep-dive:
                    </p>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200">
                        <span className="text-xs font-mono text-stone-500">research prompt</span>
                        <button
                          onClick={copyDeeperPrompt}
                          className="text-xs px-2.5 py-1 bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 rounded-md transition-all font-mono shadow-sm"
                        >
                          {deeperCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="px-4 py-4 text-xs text-stone-600 whitespace-pre-wrap leading-relaxed">
                        {deeperPrompt}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer footnote */}
        <div className="mt-16 pt-6 border-t border-stone-200">
          <a
            href="https://github.com/GrahamMcBain/YC-Helper#how-this-is-built"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            * This app itself runs on the Messages API — see how it&apos;s built →
          </a>
        </div>
      </div>
    </main>
  );
}
