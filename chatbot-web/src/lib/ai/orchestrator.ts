import { streamText } from 'ai';
import { getModel } from './models';
import { buildSystemPrompt } from './templates';
import { moderateInput, moderateOutput } from './moderation';
import { buildRagContext } from '@/lib/rag/retriever';
import { executeTool, getToolDefinitions } from '@/lib/tools/registry';
import '@/lib/tools/calculator';
import '@/lib/tools/web-search';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export interface OrchestratorOptions {
  modelId: string;
  systemPrompt?: string;
  globalSystemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  knowledgeBaseIds?: string[];
  userApiKey?: string;
  onToken?: (token: string) => void;
  onUsage?: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
}

export async function* orchestrateChat(userMessage: string, history: ChatMessage[], options: OrchestratorOptions): AsyncGenerator<{
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'done';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  usage?: { promptTokens: number; completionTokens: number };
  error?: string;
}> {
  const moderation = moderateInput(userMessage);
  if (moderation.blocked) {
    yield { type: 'error', error: `Content moderation: ${moderation.reason}` };
    return;
  }

  let ragContext = '';
  if (options.knowledgeBaseIds?.length) {
    try {
      ragContext = await buildRagContext(userMessage, options.knowledgeBaseIds);
    } catch {
      // silently continue without RAG
    }
  }

  const systemContent = buildSystemPrompt(
    options.systemPrompt,
    options.globalSystemPrompt,
    ragContext
  );

  const systemMsg: ChatMessage = { role: 'user', content: systemContent };
  const allMessages = [systemMsg, ...history];

  try {
    const model = getModel(options.modelId, options.userApiKey);
    const tools = getToolDefinitions();
    const hasTools = tools.length > 0;

    const result = streamText({
      model,
      messages: allMessages,
      temperature: options.temperature ?? 0.7,
      topP: options.topP ?? 1,
      maxOutputTokens: options.maxTokens ?? 4096,
      ...(hasTools && {
        tools: Object.fromEntries(
          tools.map(t => [t.name, {
            description: t.description,
            parameters: t.parameters as Record<string, unknown>,
          }])
        ),
        maxSteps: 5,
      }),
    });

    let fullContent = '';

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          fullContent += part.text;
          yield { type: 'text', content: part.text };
          break;
        case 'tool-call': {
          const toolArgs = (part as any).args ?? (part as any).input ?? {};
          yield {
            type: 'tool-call',
            toolName: part.toolName,
            toolArgs: toolArgs as Record<string, unknown>,
          };

          try {
            const toolResult = await executeTool(part.toolName, toolArgs as Record<string, unknown>);
            yield { type: 'tool-result', toolName: part.toolName, toolResult: toolResult.result };
          } catch (e) {
            yield { type: 'error', error: `Tool ${part.toolName} failed: ${(e as Error).message}` };
          }
          break;
        }
        case 'error':
          yield { type: 'error', error: part.error };
          return;
      }
    }

    const usage = await result.usage;

    yield {
      type: 'usage',
      usage: {
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
      },
    };

    yield { type: 'done' };

  } catch (e) {
    yield { type: 'error', error: `AI service error: ${(e as Error).message}` };
  }
}

export function prepareHistory(messages: { role: string; content: string }[]): ChatMessage[] {
  return messages.map(m => ({
    role: m.role as ChatMessage['role'],
    content: m.content,
  }));
}
