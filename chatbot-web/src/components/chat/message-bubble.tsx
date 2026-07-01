'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';
import { MessageActions } from './message-actions';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  isLast?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onFork?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isStreaming, isLast, onEdit, onFork, onRegenerate, onDelete }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    onEdit?.(message.id, trimmed);
    setEditing(false);
  }, [editValue, message.id, message.content, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditValue(message.content);
    setEditing(false);
  }, [message.content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  return (
    <div className={cn(
      'group/message flex animate-slide-up gap-3',
      isUser ? 'justify-end' : 'justify-start'
    )}>
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
              : 'bg-muted text-foreground rounded-bl-md',
            message.staleBranch && 'opacity-50'
          )}
        >
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full resize-none rounded-lg border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
          {isStreaming && message.role === 'assistant' && !message.content && (
            <div className="flex gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>
        <div className={cn('flex items-center gap-2 px-1', isUser && 'flex-row-reverse')}>
          <p className={cn('text-[11px] text-muted-foreground', isUser && 'text-right')}>
            {formatTime(message.createdAt)}
            {message.edited && <span className="ml-1 italic">(edited)</span>}
            {message.tokensIn && message.tokensOut && ` · ${message.tokensIn + message.tokensOut} tokens`}
          </p>
          {!isStreaming && (
            <MessageActions
              content={message.content}
              onEdit={() => { setEditValue(message.content); setEditing(true); }}
              onFork={() => onFork?.(message.id)}
              onRegenerate={() => onRegenerate?.(message.id)}
              onDelete={() => onDelete?.(message.id)}
              isUser={isUser}
              isLast={isLast}
            />
          )}
        </div>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          U
        </div>
      )}
    </div>
  );
}
