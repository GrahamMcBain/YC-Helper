"""
Messages API starter: extract structured fields from a messy customer request.
One call, one tool, forced structured output. No harness needed.
"""
import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

MODEL = "claude-sonnet-4-6"  # swap claude-haiku-4-5-20251001 for cheaper/faster at scale

load_dotenv()

SYSTEM_PROMPT = """\
You are a customer-request triage assistant. Extract the key structured fields from the incoming request exactly as stated — do not infer, guess, or fill in information that isn't there. If a field is absent, return null.\
"""

TRIAGE_TOOL = {
    "name": "triage_request",
    "description": "Extract structured fields from a customer support request.",
    "input_schema": {
        "type": "object",
        "properties": {
            "issue_type": {
                "type": ["string", "null"],
                "description": "Category: billing | technical | refund | feature_request | other"
            },
            "urgency": {
                "type": ["string", "null"],
                "enum": ["low", "medium", "high", None],
                "description": "Urgency level inferred from tone and wording"
            },
            "product": {
                "type": ["string", "null"],
                "description": "Product or feature mentioned"
            },
            "account_id": {
                "type": ["string", "null"],
                "description": "Account or order ID if mentioned"
            },
            "summary": {
                "type": "string",
                "description": "One-sentence plain-English summary of the request"
            },
            "suggested_team": {
                "type": ["string", "null"],
                "description": "Which internal team should handle this: billing | engineering | success | product"
            }
        },
        "required": ["issue_type", "urgency", "product", "account_id", "summary", "suggested_team"]
    }
}

SAMPLE_REQUEST = """\
Hi, I've been trying to export my invoices for the last 3 days and the button just spins forever.
My account is #ACT-88201. This is urgent because my accountant needs these by EOD Friday for our audit.
We're on the Business plan. Please help ASAP!\
"""


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set.")
        return

    client = Anthropic(api_key=api_key)

    print("Customer request:")
    print(f"  {SAMPLE_REQUEST[:80]}...")
    print()

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        # Prompt caching: add cache_control to system/messages for high-volume runs:
        # system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        tools=[TRIAGE_TOOL],
        tool_choice={"type": "tool", "name": "triage_request"},
        messages=[{"role": "user", "content": SAMPLE_REQUEST}],
    )

    tool_block = next(b for b in response.content if b.type == "tool_use")
    fields = tool_block.input

    print("Extracted fields:")
    for key, val in fields.items():
        print(f"  {key:<18} {val}")

    print(f"\nTokens used: {response.usage.input_tokens} in / {response.usage.output_tokens} out")


if __name__ == "__main__":
    main()
