import os
import sys
import json
from anthropic import Anthropic
from dotenv import load_dotenv

MODEL = "claude-sonnet-4-6"  # swap claude-haiku-4-5-20251001 for cheaper/faster classification

load_dotenv()

SYSTEM_PROMPT = """\
You are an honest technical advisor for founders deciding how to build an AI product on the Claude Developer Platform. Your job is to recommend the RIGHT primitive for their use case — even when the right answer is "you don't need our heavier tooling" or "Claude isn't your first call here." You are a trusted broker, not a salesperson. Be direct and concrete.

Classify the user's described use case along these axes: task horizon (single-pass vs. long-horizon over many steps/minutes), autonomy (human-in-the-loop synchronous vs. unattended/background), tool use (none/few vs. many tools or code/bash execution), durability (ephemeral vs. must survive crashes/disconnects and resume), auditability (low vs. regulated / needs an inspectable event log), latency (async-tolerant vs. realtime/voice sub-second), and state (stateless vs. needs persistent session memory).

Apply this routing:
- **Managed Agents** when the task is long-horizon AND at least one of: runs unattended, must survive crashes/resume, uses many tools or code execution, or needs an auditable event log (common in regulated verticals like finance, healthcare, insurance, legal). These founders should not hand-build a harness. Point them to the launch-your-agent tool.
- **Messages API** when the task is bounded/single-pass, synchronous, uses few or no tools, and needs no durable session — e.g., classification, extraction, summarization, a single tool-augmented response. Hand them the Messages API starter. (Mention prompt caching / batch if it's high-volume.)
- **not_claude_first** when the core loop is realtime/voice or sub-second-latency conversational. Be honest: a managed long-horizon harness is the wrong starting point; recommend a streaming-first approach. Do NOT pitch or scaffold a competitor — give plain, useful advice and stop.

When signals conflict, explain the tradeoff and pick the primitive that minimizes undifferentiated infrastructure the founder would otherwise build themselves. Always return your answer via the recommend_claude_path tool.\
"""

TOOL = {
    "name": "recommend_claude_path",
    "description": "Return a structured recommendation for which Claude Developer Platform primitive best fits the described use case.",
    "input_schema": {
        "type": "object",
        "properties": {
            "recommendation": {
                "type": "string",
                "enum": ["managed_agents", "messages_api", "not_claude_first"],
                "description": "The recommended primitive"
            },
            "confidence": {
                "type": "string",
                "enum": ["high", "medium", "low"],
                "description": "Confidence level in the recommendation"
            },
            "signals": {
                "type": "object",
                "description": "Per-axis classification with one-line justification each",
                "properties": {
                    "horizon": {"type": "string", "description": "short | long — one-line justification"},
                    "autonomy": {"type": "string", "description": "synchronous | unattended — one-line justification"},
                    "tool_use": {"type": "string", "description": "none/few | many/code-exec — one-line justification"},
                    "durability": {"type": "string", "description": "ephemeral | must-survive-crashes — one-line justification"},
                    "auditability": {"type": "string", "description": "low | regulated/needs-audit-log — one-line justification"},
                    "latency": {"type": "string", "description": "async-ok | realtime/voice — one-line justification"},
                    "state": {"type": "string", "description": "stateless | persistent-session — one-line justification"}
                },
                "required": ["horizon", "autonomy", "tool_use", "durability", "auditability", "latency", "state"]
            },
            "reasoning": {
                "type": "string",
                "description": "2-4 sentences explaining the recommendation in plain language"
            },
            "next_step": {
                "type": "string",
                "description": "What to do next, with the relevant link"
            },
            "starter": {
                "type": ["string", "null"],
                "enum": ["messages_api", "managed_agents", None],
                "description": "Which starter applies, or null for not_claude_first"
            }
        },
        "required": ["recommendation", "confidence", "signals", "reasoning", "next_step", "starter"]
    }
}

STARTER_PATHS = {
    "messages_api": "starters/messages_api/main.py",
    "managed_agents": "starters/managed_agents/main.py",
}

RUN_COMMANDS = {
    "messages_api": "python starters/messages_api/main.py",
    "managed_agents": "python starters/managed_agents/main.py",
}


def get_use_case() -> str:
    if len(sys.argv) > 1:
        return " ".join(sys.argv[1:])
    print("Describe your use case (press Enter twice when done):")
    lines = []
    try:
        while True:
            line = input()
            if line == "" and lines and lines[-1] == "":
                break
            lines.append(line)
    except EOFError:
        pass
    return "\n".join(lines).strip()


def print_card(rec: dict) -> None:
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"

    confidence_colors = {"high": GREEN, "medium": YELLOW, "low": RED}
    rec_labels = {
        "managed_agents": "Managed Agents",
        "messages_api": "Messages API",
        "not_claude_first": "Not Claude First",
    }

    recommendation = rec["recommendation"]
    confidence = rec["confidence"]
    color = confidence_colors.get(confidence, "")

    print()
    print(f"{BOLD}{'─' * 60}{RESET}")
    print(f"{BOLD}  Recommendation: {CYAN}{rec_labels[recommendation]}{RESET}  "
          f"{color}[{confidence} confidence]{RESET}")
    print(f"{BOLD}{'─' * 60}{RESET}")
    print()

    print(f"{BOLD}Signal breakdown:{RESET}")
    signals = rec.get("signals", {})
    signal_order = ["horizon", "autonomy", "tool_use", "durability", "auditability", "latency", "state"]
    for key in signal_order:
        val = signals.get(key, "")
        print(f"  {DIM}{key:<14}{RESET} {val}")
    print()

    print(f"{BOLD}Reasoning:{RESET}")
    for line in rec["reasoning"].split(". "):
        if line:
            print(f"  {line.rstrip('.')}.")
    print()

    print(f"{BOLD}Next step:{RESET}")
    print(f"  {rec['next_step']}")
    print()

    starter = rec.get("starter")
    if starter and starter in STARTER_PATHS:
        print(f"{BOLD}Starter:{RESET}")
        print(f"  Path:  {CYAN}{STARTER_PATHS[starter]}{RESET}")
        print(f"  Run:   {GREEN}{RUN_COMMANDS[starter]}{RESET}")
        print()

    print(f"{BOLD}{'─' * 60}{RESET}")
    print()


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set.")
        print("Copy .env.example to .env and add your key, or export ANTHROPIC_API_KEY=<your-key>")
        sys.exit(1)

    use_case = get_use_case()
    if not use_case:
        print("Error: no use case provided.")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    print("\nAnalyzing your use case...")

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=[TOOL],
        tool_choice={"type": "tool", "name": "recommend_claude_path"},
        messages=[{"role": "user", "content": use_case}],
    )

    tool_use_block = next(
        (block for block in response.content if block.type == "tool_use"),
        None,
    )
    if not tool_use_block:
        print("Error: model did not return a structured recommendation. Try again.")
        sys.exit(1)

    print_card(tool_use_block.input)


if __name__ == "__main__":
    main()
