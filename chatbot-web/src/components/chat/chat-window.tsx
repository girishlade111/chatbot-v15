'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { useChat } from '@/hooks/use-chat';

export function ChatWindow() {
  const { activeConversationId, isStreaming, conversations, createConversation, setActiveConversation } = useChatStore();
  const { sendMessage, stop } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, activeConv?.messages[activeConv?.messages.length - 1]?.content]);

  const handleNewChat = () => {
    const id = createConversation();
    setActiveConversation(id);
  };

  if (!activeConv) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Start a conversation</h1>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Choose a model, ask a question, or upload files to begin.
        </p>
        <button
          onClick={handleNewChat}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {activeConv.messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput onSend={sendMessage} onStop={stop} isStreaming={isStreaming} />
    </div>
  );
}
