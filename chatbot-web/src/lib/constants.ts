export const MODELS: { id: string; name: string; provider: 'openai' | 'anthropic' | 'google' | 'openrouter'; model: string; capabilities: string[] }[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', capabilities: ['chat', 'vision', 'tools', 'streaming'] },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini', capabilities: ['chat', 'vision', 'tools', 'streaming'] },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', model: 'claude-3-5-sonnet-latest', capabilities: ['chat', 'vision', 'tools', 'streaming'] },
  { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic', model: 'claude-3-5-haiku-latest', capabilities: ['chat', 'vision', 'tools', 'streaming'] },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', model: 'gemini-2.0-flash', capabilities: ['chat', 'vision', 'tools', 'streaming'] },
];

export const PLAN_LIMITS: Record<string, { maxConversations: number; maxTokens: number; maxKnowledgeBases: number; rateLimitRPM: number; allowedModels: string[] }> = {
  FREE: { maxConversations: 50, maxTokens: 100000, maxKnowledgeBases: 2, rateLimitRPM: 10, allowedModels: ['gpt-4o-mini', 'gemini-2.0-flash'] },
  STARTER: { maxConversations: 200, maxTokens: 500000, maxKnowledgeBases: 5, rateLimitRPM: 60, allowedModels: ['gpt-4o-mini', 'gpt-4o', 'gemini-2.0-flash', 'claude-3.5-haiku'] },
  PRO: { maxConversations: 1000, maxTokens: 5000000, maxKnowledgeBases: 20, rateLimitRPM: 300, allowedModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3.5-sonnet', 'claude-3.5-haiku', 'gemini-2.0-flash'] },
  ENTERPRISE: { maxConversations: -1, maxTokens: -1, maxKnowledgeBases: 100, rateLimitRPM: 1000, allowedModels: ['*'] },
};

export const TOKEN_COST_PER_MODEL: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5 / 1e6, output: 10 / 1e6 },
  'gpt-4o-mini': { input: 0.15 / 1e6, output: 0.6 / 1e6 },
  'claude-3-5-sonnet-latest': { input: 3 / 1e6, output: 15 / 1e6 },
  'claude-3-5-haiku-latest': { input: 0.8 / 1e6, output: 4 / 1e6 },
  'gemini-2.0-flash': { input: 0.1 / 1e6, output: 0.4 / 1e6 },
};
