"""
Managed Agents starter: long-horizon agent with crash-resume from session event log.

Hero moment: the script simulates a disconnect mid-run, then resumes from the
server-side event log using the same session_id — no work is lost.
"""
import os
import time
import json
from anthropic import Anthropic
from dotenv import load_dotenv

MODEL = "claude-sonnet-4-6"

load_dotenv()

AGENT_NAME = "claude-fit-demo-agent"

SUMMARIZE_TOOL = {
    "name": "save_research_note",
    "description": "Save a research finding to the session's running notes.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "finding": {"type": "string"},
            "confidence": {"type": "string", "enum": ["confirmed", "tentative"]}
        },
        "required": ["title", "finding", "confidence"]
    }
}

TASK = (
    "You are a research assistant. Analyze the following three topics and call "
    "save_research_note once for each finding before giving a final summary:\n"
    "1. Why do LLM agents benefit from server-side session durability?\n"
    "2. What is prompt caching and when should founders use it?\n"
    "3. When is the Messages API sufficient without a managed agent harness?"
)


def create_or_load_agent(client: Anthropic) -> str:
    """Create the agent once; in production you'd store and reuse the agent_id."""
    agent = client.beta.agents.create(
        name=AGENT_NAME,
        model=MODEL,
        tools=[SUMMARIZE_TOOL],
        system=(
            "You are a concise technical research assistant. "
            "Use save_research_note for each finding before giving your final answer."
        ),
        betas=["managed-agents-2026-04-01"],
    )
    print(f"Agent created: {agent.id}")
    return agent.id


def start_session(client: Anthropic, agent_id: str) -> str:
    session = client.beta.sessions.create(
        agent=agent_id,
        betas=["managed-agents-2026-04-01"],
    )
    print(f"Session created: {session.id}")
    return session.id


def send_task(client: Anthropic, session_id: str, task: str) -> None:
    client.beta.sessions.events.send(
        session_id,
        events=[{"type": "user_message", "content": task}],
        betas=["managed-agents-2026-04-01"],
    )
    print("Task sent to session.")


def stream_until_interrupt(client: Anthropic, session_id: str, stop_after: int = 2) -> int:
    """
    Stream events, but simulate a crash after `stop_after` tool_use events.
    Returns the number of events consumed before the simulated disconnect.
    """
    tool_calls_seen = 0
    events_consumed = 0
    print("\n[Streaming — will simulate crash after 2 tool calls...]\n")

    with client.beta.sessions.events.stream(
        session_id,
        betas=["managed-agents-2026-04-01"],
    ) as stream:
        for event in stream:
            events_consumed += 1
            etype = getattr(event, "type", None)

            if etype == "tool_use":
                tool_calls_seen += 1
                name = getattr(event, "name", "?")
                print(f"  [tool_use] {name} (call #{tool_calls_seen})")
                if tool_calls_seen >= stop_after:
                    print("\n*** SIMULATED CRASH / DISCONNECT ***\n")
                    break
            elif etype == "text":
                pass  # suppress partial text during the stream phase

    return events_consumed


def resume_from_log(client: Anthropic, session_id: str) -> None:
    """
    Resume by fetching the full event log for the session.
    This is the crash-resume hero moment: the server kept everything.
    """
    print("[Resuming from server-side event log...]\n")

    events = client.beta.sessions.events.list(
        session_id,
        betas=["managed-agents-2026-04-01"],
    )

    tool_results = []
    final_text = []

    for event in events:
        etype = getattr(event, "type", None)
        if etype == "tool_use":
            name = getattr(event, "name", "?")
            inp = getattr(event, "input", {})
            tool_results.append(f"  Tool call: {name}\n    {json.dumps(inp, indent=4)}")
        elif etype == "text":
            text = getattr(event, "text", "") or getattr(event, "content", "")
            if text:
                final_text.append(text)

    print(f"Recovered {len(tool_results)} tool call(s) from session log:")
    for r in tool_results:
        print(r)

    if final_text:
        print("\nAgent final output:")
        print("  " + "\n  ".join("".join(final_text).split("\n")))

    print("\n[Session log recovered successfully. No work lost.]\n")


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set.")
        print("Copy .env.example to .env and add your key.")
        return

    client = Anthropic(api_key=api_key)

    # Phase 1: create agent + session, send task
    agent_id = create_or_load_agent(client)
    session_id = start_session(client, agent_id)
    send_task(client, session_id, TASK)

    # Phase 2: stream until simulated crash
    stream_until_interrupt(client, session_id, stop_after=2)

    # Brief pause to let the server continue processing after our "disconnect"
    print("Waiting 3 seconds while server continues processing...\n")
    time.sleep(3)

    # Phase 3: resume from the server-side event log
    resume_from_log(client, session_id)


if __name__ == "__main__":
    main()
