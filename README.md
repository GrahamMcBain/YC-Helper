# claude-fit — an honest agent-fit advisor

**When NOT to build on Claude (and when you absolutely should.)**

Most founders reach for the most powerful-sounding AI primitive and discover too late it was overkill. This repo gives you two ways to get an honest recommendation for which Claude Developer Platform tier fits your use case — including the answer that you don't need a managed agent at all.

The advisor dogfoods what it advises: it's a bounded, single-pass Messages API call that uses tool use for structured output.

---

## How this is built

### Architecture

```
Browser  (app/page.tsx — React client component)
    │
    │  POST /api/recommend  { useCase: "…" }
    ▼
Next.js server route  (app/api/recommend/route.ts)
    │  ANTHROPIC_API_KEY lives here — never sent to the client
    │
    ▼
Anthropic Messages API
    model:       claude-sonnet-4-6
    system:      SYSTEM_PROMPT  (honest advisor persona, lib/advisor.ts)
    tools:       [recommend_claude_path]  ← 7-axis signal schema
    tool_choice: { type: "tool", name: "recommend_claude_path" }  ← forced
    │
    ▼
Structured JSON  { recommendation, confidence, signals, reasoning, next_step }
    │
    ▼
Browser — result card renders inline, no page navigation
```

### Why the Messages API and not Managed Agents

The classification task maps cleanly onto every Messages API signal:

| Signal | This app | Why |
|---|---|---|
| **Horizon** | Short | One HTTP request → one structured response |
| **Autonomy** | Synchronous | The founder waits; no background work |
| **Tool use** | One tool | `recommend_claude_path` for structured output only |
| **Durability** | Ephemeral | If a request fails, just retry — nothing to resume |
| **Auditability** | Low | Not a regulated workflow; no event log needed |
| **Latency** | Async-ok | A few seconds is fine for a one-time recommendation |
| **State** | Stateless | Each request is independent; no session memory |

Managed Agents would be the wrong choice here. That tier is designed for tasks that are long-horizon, run unattended, need crash recovery, orchestrate many tools, or require an auditable event log — none of which apply to a classification call. Using it anyway would add session management overhead, per-session-hour billing, and a harness with no benefit.

The self-consistency is intentional. If an advisor about API choice used the wrong API, you shouldn't trust its advice. The framework it applies to your use case is the same framework that determined how to build it.

### Key implementation details

- **Forced `tool_choice`** — `{ type: "tool", name: "recommend_claude_path" }` guarantees Claude returns structured JSON rather than prose. No parsing fragility.
- **Server-side key** — `ANTHROPIC_API_KEY` is accessed only in `app/api/recommend/route.ts`, a Next.js server route. It never appears in the client bundle or any network response to the browser.
- **Typed schema** — `lib/advisor.ts` defines the tool schema and TypeScript interfaces. The same `SYSTEM_PROMPT` and tool definition run in both the Next.js API route and the Python CLI (`advisor.py`), keeping both surfaces in sync.
- **No database, no auth, no state** — consistent with a stateless Messages API design. The only infrastructure needed is one Vercel env var.

---

## Web app (recommended)

One page, no install, no API key required from you. Type a sentence, get a recommendation inline.

### Deploy to Vercel

```bash
# 1. Fork / clone this repo
# 2. Push to GitHub
# 3. Import into Vercel at vercel.com/new
# 4. Add one env var in Project Settings → Environment Variables:
#    ANTHROPIC_API_KEY=sk-ant-...
# 5. Deploy
```

Or run locally:

```bash
cd claude-fit
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

---

## CLI (for local use / read the source)

```bash
git clone <this-repo>
cd claude-fit
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
python advisor.py "<describe what you're building>"
```

### Example outputs

```
python advisor.py "autonomous back-office ops for restaurants"
→ Recommendation: Managed Agents  [high confidence]
  ...points to starters/managed_agents/main.py

python advisor.py "extract fields from uploaded invoices, one at a time"
→ Recommendation: Messages API  [high confidence]
  ...points to starters/messages_api/main.py

python advisor.py "realtime voice agent that handles phone calls"
→ Recommendation: Not Claude First  [high confidence]
  ...honest streaming-first advice, no competitor pitch
```

---

## The decision framework

Before picking a primitive, classify your use case along seven axes:

| Axis | Short | Long |
|---|---|---|
| **Horizon** | Single pass, done in one call | Multi-step over minutes |
| **Autonomy** | User waits for response | Runs unattended in the background |
| **Tool use** | None or one lookup | Many tools, code/bash execution |
| **Durability** | Ephemeral — restart is fine | Must survive crashes and resume |
| **Auditability** | Low | Regulated — needs inspectable event log |
| **Latency** | Async-tolerant | Realtime / voice / sub-second |
| **State** | Stateless | Persistent session memory |

### The three buckets

**Managed Agents** — use when the task is long-horizon AND at least one of:
- Runs unattended or in the background
- Must survive crashes and resume (finance, healthcare, legal, insurance)
- Uses many tools or code/bash execution
- Needs an auditable event log for compliance

*Example shapes:* autonomous back-office ops, multi-day research pipelines, long-running coding agents, regulated-industry workflow automation.

**Messages API** — use when the task is bounded, synchronous, uses few or no tools, and needs no durable session:
- Classification, extraction, summarization
- Single tool-augmented lookup or triage
- One-shot structured output

*Example shapes:* extract fields from invoices, triage support tickets, classify sentiment, summarize a document, answer a question with a tool lookup.

**Not Claude first** — when the core loop is realtime/voice or requires sub-second conversational latency, a managed long-horizon harness is the wrong starting point. Build streaming-first. Come back when you have a bounded task to offload.

---

## The two starters

**[`starters/messages_api/`](starters/messages_api/)** — Single-call triage and structured extraction. Shows how to force tool use for structured output in ~40 lines. Right for any bounded, synchronous task.

**[`starters/managed_agents/`](starters/managed_agents/)** — Long-horizon agent with crash → resume from the server-side event log. Demonstrates the durability hero feature: simulate a disconnect, recover from `sessions.events.list()`, no work lost.

---

## Repo structure

```
/
  app/
    page.tsx                 # web UI — form, example chips, result card, CTAs
    layout.tsx               # root layout + metadata
    globals.css              # Tailwind directives
    api/recommend/route.ts   # server-side Messages API call (key never leaves server)
  lib/
    advisor.ts               # SYSTEM_PROMPT + tool schema + TypeScript types
    buildspec.ts             # Messages API build-spec template
  starters/
    messages_api/            # runnable Python starter
    managed_agents/          # runnable Python starter
  advisor.py                 # CLI version
  requirements.txt
  package.json
  .env.example
```
