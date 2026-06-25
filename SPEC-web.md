# Build Spec v2 — "claude-fit" as a value-first web app

## What changed from v1 (CLI)
v1 was a CLI: clone → install → set key → run. All friction sat *before* the value. v2 is a **one-click web page**: a founder lands from the email, types one sentence, and gets an honest recommendation in seconds — no install, no key. The classification logic (system prompt + tool schema) ports over unchanged; only the front door and delivery change.

## Context for you, the builder
This is a technical artifact for a new YC batch. Its job: help a founder honestly decide **which Claude Developer Platform primitive fits their use case** — Managed Agents, the Messages API, or (rarely) none of ours yet — then route them to the right next action.

**Build it on the Messages API.** The classifier is a bounded, single-pass, synchronous task with no durable session — which, by the tool's own framework, is exactly a Messages API job. Building it on Managed Agents would contradict its own advice. That self-consistency is part of the credibility; keep it.

Tone: honest broker. Confident enough to tell people when *not* to use us. Never oversell.

## Stack & deployment
- **Next.js (App Router) + TypeScript**, deployed on **Vercel**.
- One server route `app/api/recommend/route.ts` that calls the Anthropic **Messages API** server-side using `@anthropic-ai/sdk`. The API key (`ANTHROPIC_API_KEY`) lives in a Vercel env var and is **never** sent to the client.
- Minimal styling — Tailwind or plain CSS. Clean, fast, mobile-friendly, one screen.
- Default model: `claude-sonnet-4-6` (constant at top; comment that `claude-haiku-4-5-20251001` is a cheaper/faster swap for classification).
- No auth, no database, no analytics.

## User flow
1. **Landing (one screen):** headline echoing the email — "When NOT to build on Claude (and when you absolutely should)" — a single textarea ("Describe what you're building, in a sentence or two"), and a submit button. Add 3 clickable example chips that prefill the box: *"autonomous back-office for restaurants"*, *"extract fields from invoices"*, *"realtime voice agent for phone calls"*. No signup, no key — value first.
2. **Submit** → POST the text to `/api/recommend`.
3. **Server route** calls the Messages API with the system prompt + `recommend_claude_path` tool (forced `tool_choice`), returns the structured JSON.
4. **Result renders inline** as a recommendation card: recommendation + confidence badge, the 7-axis signal breakdown, the reasoning, and an outcome-specific CTA (below).
5. No page navigation — result appears on the same screen under the input.

## The three outcomes (CTAs)
- **`managed_agents`** → a button "Start with launch-your-agent" linking to https://github.com/anthropics/launch-your-agent, plus one line on why a managed harness fits (long-horizon, unattended, recoverable, auditable).
- **`messages_api`** → a **copy-paste build spec** block: a ready-to-use prompt (pre-filled with the founder's own use-case text) they paste into Claude Code / Claude to generate their Messages API app, with a working **Copy** button. Also link the runnable `starters/messages_api/` as "or grab working code."
- **`not_claude_first`** → honest guidance text (build streaming-first; come back when you have a bounded task to offload). **No competitor link, no starter, no CTA.** Text only.

**Optional accelerant** (only on the two Claude routes): a collapsible "Go deeper on your pattern" that reveals a research prompt to paste into Claude. Secondary — never its own primary bucket.

## Port these over verbatim from the existing repo (`claude-fit/advisor.py`)
- `SYSTEM_PROMPT` → `lib/advisor.ts`
- the `recommend_claude_path` tool schema (7 signal axes: horizon, autonomy, tool_use, durability, auditability, latency, state) → `lib/advisor.ts`
- forced `tool_choice` pattern → the server route

## The Messages API build-spec template (put in `lib/buildspec.ts`)
A parametrized prompt the UI fills with the founder's use case. Strong default:
> "Help me build on the Anthropic Messages API. My use case: `<USE_CASE>`. Write a minimal, runnable Python script using the `anthropic` SDK that handles this as a bounded, single-pass task — use tool use for structured output if the task needs structured fields, otherwise a plain completion. Include a focused system prompt, the API call, result parsing, setup instructions, and a note on enabling prompt caching for high volume. Keep it under ~50 lines."

## Repo structure
```
claude-fit/
  app/
    page.tsx                 # landing + inline result UI
    api/recommend/route.ts   # server-side Messages API call
  lib/
    advisor.ts               # SYSTEM_PROMPT + tool schema + types (ported)
    buildspec.ts             # Messages API build-spec template
  starters/                  # keep existing runnable starters (optional "view source" layer)
    messages_api/...
    managed_agents/...
  README.md
  .env.example               # ANTHROPIC_API_KEY=
  package.json
```
Keep the existing Python starters and (optionally) the CLI advisor as a secondary "run it / read the source" layer — they show the dogfooding is real code.

## Guardrails
- **API key server-side only** — verify it never appears in a client bundle or network response.
- `not_claude_first` is **text advice only** — no competitor product, ever.
- *(No rate limiting / credit protection needed — this is a takehome; only the hiring manager will use it. Keep it simple.)*
- One screen; render results inline. No multi-step wizard.
- Don't add dependencies beyond Next.js + `@anthropic-ai/sdk` (+ Tailwind if used).

## Acceptance criteria (verify before done)
- Deploys on Vercel with a single env var; loads fast; works on mobile.
- "autonomous back-office ops for restaurants" → **Managed Agents** card + launch-your-agent CTA.
- "extract fields from uploaded invoices" → **Messages API** card + copy-paste build spec; the **Copy** button works and the prompt contains the user's text.
- "realtime voice agent that handles phone calls" → **Not Claude-first**, honest advice, no CTA/starter.
- Open devtools: the API key is **not** present in any client request or bundle.
- Missing/!invalid key → graceful error message, not a stack trace.

## Definition of done
A founder clicks the email link, lands on one page, types a sentence, and within seconds has an honest recommendation and a concrete next action — Managed Agents repo, a Messages API build spec they paste into Claude, or an honest "not yet" — without installing anything. The README stands alone as a decision guide and documents deploy steps.
