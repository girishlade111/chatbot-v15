import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, ChatSettings } from '@/types';
import { uid } from '@/lib/utils';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  settings: ChatSettings;
  isStreaming: boolean;
  error: string | null;

  setActiveConversation: (id: string) => void;
  createConversation: (parentId?: string) => string;
  deleteConversation: (id: string) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  appendToLastMessage: (conversationId: string, text: string) => void;
  forkConversation: (sourceId: string, forkMessageId: string) => string | null;
  editMessage: (conversationId: string, messageId: string, content: string) => void;
  deleteMessageAndAfter: (conversationId: string, messageId: string) => void;
  regenerateMessage: (conversationId: string, messageId: string) => void;
  setSettings: (settings: Partial<ChatSettings>) => void;
  setIsStreaming: (v: boolean) => void;
  setError: (e: string | null) => void;
  getActiveConversation: () => Conversation | undefined;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      settings: {
        model: 'gpt-4o',
        systemPrompt: '',
        temperature: 0.7,
        topP: 1,
        maxTokens: 4096,
        knowledgeBaseIds: [],
      },
      isStreaming: false,
      error: null,

      setActiveConversation: (id) => set({ activeConversationId: id }),

      createConversation: () => {
        const id = uid();
        const conv: Conversation = {
          id,
          userId: '',
          title: 'New Chat',
          model: get().settings.model,
          systemPrompt: get().settings.systemPrompt,
          temperature: get().settings.temperature,
          topP: get().settings.topP,
          maxTokens: get().settings.maxTokens,
          pinned: false,
          archived: false,
          tokenCount: 0,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ conversations: [conv, ...s.conversations], activeConversationId: id }));
        return id;
      },

      deleteConversation: (id) => set(s => ({
        conversations: s.conversations.filter(c => c.id !== id),
        activeConversationId: s.activeConversationId === id
          ? (s.conversations.find(c => c.id !== id)?.id ?? null)
          : s.activeConversationId,
      })),

      updateConversation: (id, data) => set(s => ({
        conversations: s.conversations.map(c => c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c),
      })),

      addMessage: (conversationId, message) => set(s => ({
        conversations: s.conversations.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message], updatedAt: Date.now(), tokenCount: c.tokenCount + (message.tokensIn || 0) + (message.tokensOut || 0) }
            : c
        ),
      })),

      updateMessage: (conversationId, messageId, updates) => set(s => ({
        conversations: s.conversations.map(c =>
          c.id === conversationId
            ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, ...updates } : m) }
            : c
        ),
      })),

      appendToLastMessage: (conversationId, text) => set(s => ({
        conversations: s.conversations.map(c => {
          if (c.id !== conversationId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + text };
          }
          return { ...c, messages: msgs };
        }),
      })),

      setSettings: (updates) => set(s => ({ settings: { ...s.settings, ...updates } })),
      setIsStreaming: (v) => set({ isStreaming: v }),
      setError: (e) => set({ error: e }),

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find(c => c.id === activeConversationId);
      },
    }),
    { name: 'chatbot-store', partialize: (s) => ({ conversations: s.conversations, settings: s.settings }) }
  )
);
