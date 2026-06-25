export function getBuildSpec(useCase: string): string {
  return `Help me build on the Anthropic Messages API. My use case: ${useCase}. Write a minimal, runnable Python script using the \`anthropic\` SDK that handles this as a bounded, single-pass task — use tool use for structured output if the task needs structured fields, otherwise a plain completion. Include a focused system prompt, the API call, result parsing, setup instructions, and a note on enabling prompt caching for high volume. Keep it under ~50 lines.`;
}
