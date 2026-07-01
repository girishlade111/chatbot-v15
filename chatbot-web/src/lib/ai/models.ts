import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });

const modelCache = new Map<string, LanguageModelV1>();

export function getModel(id: string, userApiKey?: string): LanguageModelV1 {
  const cacheKey = `${id}:${userApiKey || 'default'}`;
  if (modelCache.has(cacheKey)) return modelCache.get(cacheKey)!;

  let model: LanguageModelV1;

  switch (id) {
    case 'gpt-4o':
      model = userApiKey
        ? createOpenAI({ apiKey: userApiKey }).chat('gpt-4o')
        : openai.chat('gpt-4o');
      break;
    case 'gpt-4o-mini':
      model = userApiKey
        ? createOpenAI({ apiKey: userApiKey }).chat('gpt-4o-mini')
        : openai.chat('gpt-4o-mini');
      break;
    case 'claude-3.5-sonnet':
      model = userApiKey
        ? createAnthropic({ apiKey: userApiKey }).chat('claude-3-5-sonnet-latest')
        : anthropic.chat('claude-3-5-sonnet-latest');
      break;
    case 'claude-3.5-haiku':
      model = userApiKey
        ? createAnthropic({ apiKey: userApiKey }).chat('claude-3-5-haiku-latest')
        : anthropic.chat('claude-3-5-haiku-latest');
      break;
    case 'gemini-2.0-flash':
      model = userApiKey
        ? createGoogleGenerativeAI({ apiKey: userApiKey }).chat('gemini-2.0-flash')
        : google.chat('gemini-2.0-flash');
      break;
    default:
      model = openai.chat('gpt-4o');
  }

  modelCache.set(cacheKey, model);
  return model;
}
