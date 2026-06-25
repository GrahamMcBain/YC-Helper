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
  managed_agents: 'text-violet-400',
  messages_api: 'text-sky-400',
  not_claude_first: 'text-orange-400',
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-red-500/15 text-red-400 border-red-500/30',
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
    const spec = getBuildSpec(submittedUseCase);
    await navigator.clipboard.writeText(spec);
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-mono text-zinc-600 mb-5 tracking-widest uppercase">claude-fit</p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-zinc-50">
            When NOT to build on Claude
            <br />
            <span className="text-zinc-500">(and when you absolutely should)</span>
          </h1>
          <p className="mt-5 text-zinc-400 leading-relaxed">
            Describe what you&apos;re building — get an honest recommendation for which Claude Developer Platform primitive fits, or whether to start somewhere else.
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 text-sm leading-relaxed transition-colors"
          />

          {/* Example chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setUseCase(ex)}
                className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-full transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !useCase.trim()}
            className="mt-4 w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing…' : 'Get recommendation'}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-700">⌘↵ to submit</p>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">

            {/* Recommendation header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-2">Recommendation</p>
                <p className={`text-2xl font-semibold ${REC_COLORS[result.recommendation]}`}>
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
            <div className="px-6 py-5 border-b border-zinc-800">
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Signal breakdown</p>
              <div className="space-y-2.5">
                {SIGNAL_ORDER.map((key) => (
                  <div key={key} className="flex gap-4 text-sm">
                    <span className="font-mono text-zinc-600 w-24 shrink-0">{key}</span>
                    <span className="text-zinc-300">{result.signals[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasoning */}
            <div className="px-6 py-5 border-b border-zinc-800">
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Reasoning</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.reasoning}</p>
            </div>

            {/* CTA */}
            <div className="px-6 py-5">
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Next step</p>

              {result.recommendation === 'managed_agents' && (
                <div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-5">{result.next_step}</p>
                  <a
                    href="https://github.com/anthropics/launch-your-agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Start with launch-your-agent →
                  </a>
                </div>
              )}

              {result.recommendation === 'messages_api' && (
                <div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-5">{result.next_step}</p>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden mb-4">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
                      <span className="text-xs font-mono text-zinc-600">
                        Messages API build spec — paste into Claude
                      </span>
                      <button
                        onClick={copyBuildSpec}
                        className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors font-mono"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="px-4 py-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {getBuildSpec(submittedUseCase)}
                    </pre>
                  </div>
                  <p className="text-xs text-zinc-600">
                    Or grab working code:{' '}
                    <code className="text-zinc-500">starters/messages_api/main.py</code>
                  </p>
                </div>
              )}

              {result.recommendation === 'not_claude_first' && (
                <p className="text-sm text-zinc-300 leading-relaxed">{result.next_step}</p>
              )}
            </div>

            {/* Go deeper (Claude routes only) */}
            {result.recommendation !== 'not_claude_first' && (
              <div className="border-t border-zinc-800">
                <button
                  onClick={() => setGoDeeper(!goDeeper)}
                  className="w-full px-6 py-4 flex items-center justify-between text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <span>Go deeper on your pattern</span>
                  <span className="font-mono text-lg leading-none">{goDeeper ? '−' : '+'}</span>
                </button>
                {goDeeper && (
                  <div className="px-6 pb-6">
                    <p className="text-xs text-zinc-600 mb-3">
                      Research prompt — paste into Claude for a tailored deep-dive:
                    </p>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
                        <span className="text-xs font-mono text-zinc-600">research prompt</span>
                        <button
                          onClick={copyDeeperPrompt}
                          className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors font-mono"
                        >
                          {deeperCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="px-4 py-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
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
        <div className="mt-16 pt-6 border-t border-zinc-800/60">
          <a
            href="https://github.com/GrahamMcBain/YC-Helper#how-this-is-built"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            * This app itself runs on the Messages API — see how it&apos;s built →
          </a>
        </div>
      </div>
    </main>
  );
}
