import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, SYSTEM_PROMPT, RECOMMEND_TOOL } from '@/lib/advisor';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  let useCase: string;
  try {
    const body = await req.json();
    useCase = body.useCase?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!useCase) {
    return NextResponse.json({ error: 'useCase is required.' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [RECOMMEND_TOOL] as any,
      tool_choice: { type: 'tool', name: 'recommend_claude_path' },
      messages: [{ role: 'user', content: useCase }],
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return a structured recommendation. Try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json(toolBlock.input);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error from Anthropic API.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
