'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex animate-slide-up gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          AI
        </div>
      )}
      <div className={cn('max-w-[75%] space-y-1', isUser && 'order-1')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {isStreaming && message.role === 'assistant' && !message.content && (
            <div className="flex gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>
        <p className={cn('text-[11px] text-muted-foreground px-1', isUser && 'text-right')}>
          {formatTime(message.createdAt)}
          {message.tokensIn && message.tokensOut && ` · ${message.tokensIn + message.tokensOut} tokens`}
        </p>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          U
        </div>
      )}
    </div>
  );
}
