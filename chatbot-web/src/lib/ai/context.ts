import type { Message } from '@/types/chat';

const MAX_CONTEXT_TOKENS = 128_000;
const TOKENS_PER_CHAR = 0.25;
const SUMMARY_THRESHOLD = 100_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

export function trimToTokenLimit(messages: Message[], limit: number = MAX_CONTEXT_TOKENS): Message[] {
  const result = [...messages];
  let totalTokens = 0;

  for (let i = result.length - 1; i >= 0; i--) {
    totalTokens += estimateTokens(result[i].content);
    if (totalTokens > limit) {
      return result.slice(i + 1);
    }
  }
  return result;
}

export function shouldSummarize(messages: Message[]): boolean {
  const total = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  return total > SUMMARY_THRESHOLD;
}

export function buildContextWindow(messages: Message[], maxTokens: number = MAX_CONTEXT_TOKENS): Message[] {
  const trimmed = trimToTokenLimit(messages, maxTokens);

  if (trimmed.length < messages.length) {
    const systemMsg: Message = {
      id: 'context-summary',
      conversationId: messages[0]?.conversationId ?? '',
      role: 'system',
      content: `[Note: The conversation was trimmed to fit context limits. Earlier messages have been removed.]`,
      createdAt: Date.now(),
    };
    return [systemMsg, ...trimmed];
  }

  return trimmed;
}
