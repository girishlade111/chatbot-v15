export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  edited?: boolean;
  editedAt?: number;
  parentId?: string;
  branchPoint?: boolean;
  staleBranch?: boolean;
  createdAt: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  systemPrompt?: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  pinned: boolean;
  archived: boolean;
  folderId?: string;
  parentId?: string;
  branchId?: string;
  tokenCount: number;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface KnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description?: string;
  chunkSize: number;
  chunkOverlap: number;
  documents: Document[];
  createdAt: number;
  updatedAt: number;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  chunkCount: number;
  errorMessage?: string;
  createdAt: number;
}

export interface PromptTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  model?: string;
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  credits: number;
  totalTokens: number;
  banned: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter';
  model: string;
  capabilities: ('chat' | 'vision' | 'tools' | 'streaming')[];
  icon: string;
  color: string;
}

export interface ChatSettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  knowledgeBaseIds: string[];
}

export interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'done';
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  toolResult?: unknown;
  error?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}
