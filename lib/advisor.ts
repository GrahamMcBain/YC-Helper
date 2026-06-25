export const MODEL = 'claude-sonnet-4-6'; // swap claude-haiku-4-5-20251001 for cheaper/faster

export type Recommendation = 'managed_agents' | 'messages_api' | 'not_claude_first';
export type Confidence = 'high' | 'medium' | 'low';
export type Starter = 'messages_api' | 'managed_agents' | null;

export interface Signals {
  horizon: string;
  autonomy: string;
  tool_use: string;
  durability: string;
  auditability: string;
  latency: string;
  state: string;
}

export interface RecommendationResult {
  recommendation: Recommendation;
  confidence: Confidence;
  signals: Signals;
  reasoning: string;
  next_step: string;
  starter: Starter;
}

export const SYSTEM_PROMPT = `You are an honest technical advisor for founders deciding how to build an AI product on the Claude Developer Platform. Your job is to recommend the RIGHT primitive for their use case — even when the right answer is "you don't need our heavier tooling" or "Claude isn't your first call here." You are a trusted broker, not a salesperson. Be direct and concrete.

Classify the user's described use case along these axes: task horizon (single-pass vs. long-horizon over many steps/minutes), autonomy (human-in-the-loop synchronous vs. unattended/background), tool use (none/few vs. many tools or code/bash execution), durability (ephemeral vs. must survive crashes/disconnects and resume), auditability (low vs. regulated / needs an inspectable event log), latency (async-tolerant vs. realtime/voice sub-second), and state (stateless vs. needs persistent session memory).

Apply this routing:
- **Managed Agents** when the task is long-horizon AND at least one of: runs unattended, must survive crashes/resume, uses many tools or code execution, or needs an auditable event log (common in regulated verticals like finance, healthcare, insurance, legal). These founders should not hand-build a harness. Point them to the launch-your-agent tool.
- **Messages API** when the task is bounded/single-pass, synchronous, uses few or no tools, and needs no durable session — e.g., classification, extraction, summarization, a single tool-augmented response. Hand them the Messages API starter. (Mention prompt caching / batch if it's high-volume.)
- **not_claude_first** when the core loop is realtime/voice or sub-second-latency conversational. Be honest: a managed long-horizon harness is the wrong starting point; recommend a streaming-first approach. Do NOT pitch or scaffold a competitor — give plain, useful advice and stop.

When signals conflict, explain the tradeoff and pick the primitive that minimizes undifferentiated infrastructure the founder would otherwise build themselves. Always return your answer via the recommend_claude_path tool.`;

export const RECOMMEND_TOOL = {
  name: 'recommend_claude_path',
  description:
    'Return a structured recommendation for which Claude Developer Platform primitive best fits the described use case.',
  input_schema: {
    type: 'object' as const,
    properties: {
      recommendation: {
        type: 'string',
        enum: ['managed_agents', 'messages_api', 'not_claude_first'],
        description: 'The recommended primitive',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence level in the recommendation',
      },
      signals: {
        type: 'object',
        description: 'Per-axis classification with one-line justification each',
        properties: {
          horizon: { type: 'string', description: 'short | long — one-line justification' },
          autonomy: { type: 'string', description: 'synchronous | unattended — one-line justification' },
          tool_use: { type: 'string', description: 'none/few | many/code-exec — one-line justification' },
          durability: { type: 'string', description: 'ephemeral | must-survive-crashes — one-line justification' },
          auditability: { type: 'string', description: 'low | regulated/needs-audit-log — one-line justification' },
          latency: { type: 'string', description: 'async-ok | realtime/voice — one-line justification' },
          state: { type: 'string', description: 'stateless | persistent-session — one-line justification' },
        },
        required: ['horizon', 'autonomy', 'tool_use', 'durability', 'auditability', 'latency', 'state'],
      },
      reasoning: {
        type: 'string',
        description: '2-4 sentences explaining the recommendation in plain language',
      },
      next_step: {
        type: 'string',
        description: 'What to do next, with the relevant link',
      },
      starter: {
        type: ['string', 'null'],
        enum: ['messages_api', 'managed_agents', null],
        description: 'Which starter applies, or null for not_claude_first',
      },
    },
    required: ['recommendation', 'confidence', 'signals', 'reasoning', 'next_step', 'starter'],
  },
};
