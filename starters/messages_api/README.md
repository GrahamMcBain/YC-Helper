# Messages API Starter — Structured Triage in a Single Call

Extracts structured fields from a messy customer support request using one Messages API call and a forced tool response. No agent harness, no loop, no state.

## What it does

Sends a sample support ticket to Claude with a `triage_request` tool and `tool_choice` forced to that tool. Claude returns structured JSON with `issue_type`, `urgency`, `product`, `account_id`, `summary`, and `suggested_team`.

## When this tier is the right call

Use the Messages API when your task is:
- **Single-pass** — one input, one output, done
- **Synchronous** — the user or system is waiting for the response
- **Bounded** — you know roughly what shape the answer will take
- **Stateless** — no need to remember what happened across calls

If your use case is classification, extraction, summarization, a single tool-augmented lookup, or any bounded transformation — this is the right tier. No managed harness needed.

For high-volume runs, uncomment the `cache_control` line in `main.py` to enable prompt caching and cut costs significantly on repeated system prompts.

## Run

```bash
cd claude-fit
pip install -r requirements.txt
cp .env.example .env  # add your ANTHROPIC_API_KEY
python starters/messages_api/main.py
```
