# Managed Agents Starter — Long-Horizon Agent with Crash → Resume

A minimal Managed Agents session that demonstrates the platform's hero feature: durable, resumable sessions. The agent runs a multi-step research task, the script simulates a crash mid-run, and then resumes from the server-side event log without losing any work.

## What it does

1. Creates a Managed Agent with a `save_research_note` tool
2. Opens a session and sends a multi-part research task
3. Streams the session event stream — then **simulates a crash** after 2 tool calls
4. Waits briefly (server keeps running after the client disconnects)
5. **Resumes** by calling `sessions.events.list()` with the original `session_id` — all tool calls and output are there, nothing lost

## Why this needs a managed harness

| Need | What Managed Agents provides |
|---|---|
| Durability | Session state lives on Anthropic's servers, survives client disconnects |
| Auditability | Every event (tool call, message, output) is logged in the session event stream |
| Resume | `sessions.events.list(session_id)` replays the full history |
| No harness to maintain | You don't write the agent loop — the platform runs it |

Use Managed Agents when your task is long-horizon, runs unattended, or must survive crashes — especially in regulated verticals (finance, healthcare, legal) where an auditable event log is required.

## Pricing note

Managed Agents sessions are billed per session-hour in addition to standard token costs. For short-lived or high-frequency tasks, the Messages API is more cost-effective.

## Run

```bash
cd claude-fit
pip install -r requirements.txt
cp .env.example .env  # add your ANTHROPIC_API_KEY
python starters/managed_agents/main.py
```
