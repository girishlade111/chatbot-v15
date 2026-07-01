'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { useChat } from '@/hooks/use-chat';
import { Separator } from '@/components/ui/separator';
import { GitBranch, Plus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const suggestions = [
  'What can you help me with?',
  'Summarize a document',
  'Write a blog post',
  'Explain a concept',
];

export function ChatWindow() {
  const {
    activeConversationId,
    isStreaming,
    conversations,
    createConversation,
    setActiveConversation,
    forkConversation,
    editMessage,
    deleteMessageAndAfter,
    regenerateMessage,
  } = useChatStore();
  const { sendMessage, stop } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const branches = activeConversationId ? conversations.filter(c => c.parentId === activeConversationId) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, activeConv?.messages[activeConv?.messages.length - 1]?.content]);

  const handleNewChat = useCallback(() => {
    const id = createConversation();
    setActiveConversation(id);
  }, [createConversation, setActiveConversation]);

  const handleFork = useCallback((messageId: string) => {
    if (activeConversationId) {
      forkConversation(activeConversationId, messageId);
    }
  }, [activeConversationId, forkConversation]);

  const handleEdit = useCallback(async (messageId: string, content: string) => {
    if (!activeConversationId) return;
    try {
      await fetch(`/api/chat/${activeConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'edit-message', messageId, content }),
      });
    } catch {
      // silently fail — store update still applies locally
    }
    editMessage(activeConversationId, messageId, content);
  }, [activeConversationId, editMessage]);

  const handleDelete = useCallback((messageId: string) => {
    if (activeConversationId) {
      deleteMessageAndAfter(activeConversationId, messageId);
    }
  }, [activeConversationId, deleteMessageAndAfter]);

  const handleRegenerate = useCallback((messageId: string) => {
    if (activeConversationId) {
      const conv = conversations.find(c => c.id === activeConversationId);
      const msgIndex = conv?.messages.findIndex(m => m.id === messageId) ?? -1;
      const userMsg = msgIndex > 0 ? conv?.messages[msgIndex - 1] : null;
      regenerateMessage(activeConversationId, messageId);
      if (userMsg) {
        setTimeout(() => sendMessage(userMsg.content), 50);
      }
    }
  }, [activeConversationId, regenerateMessage, conversations, sendMessage]);

  const messages = activeConv?.messages ?? [];
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  if (!activeConv) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Start a conversation</h1>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Choose a model, ask a question, or upload files to begin.
        </p>
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={handleNewChat}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-1.5 inline h-4 w-4" />
          New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {branches.length > 0 && (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          <span className="font-medium">Branches:</span>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveConversation(b.id)}
              className="rounded-md bg-background px-2 py-0.5 text-xs transition-colors hover:bg-accent"
            >
              {b.title.slice(0, 24)}...
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {msg.branchPoint && (
                  <div className="mb-2 flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <GitBranch className="h-3 w-3" />
                      Branch point
                    </span>
                    <Separator className="flex-1" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isStreaming={isStreaming}
                  isLast={i === messages.length - 1 || (msg.role === 'assistant' && i === lastAssistantIndex)}
                  onEdit={handleEdit}
                  onFork={handleFork}
                  onRegenerate={handleRegenerate}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && messages.length === 0 && (
            <div className="space-y-4 px-1">
              {[1, 2].map(n => (
                <div key={n} className="flex animate-pulse gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={sendMessage} onStop={stop} isStreaming={isStreaming} disabled={isStreaming} />
    </div>
  );
}
