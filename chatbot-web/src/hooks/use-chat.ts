'use client';

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useUiStore } from '@/stores/ui-store';
import { uid } from '@/lib/utils';
import type { Message, StreamChunk } from '@/types';

export function useChat() {
  const abortRef = useRef<AbortController | null>(null);
  const {
    activeConversationId,
    settings,
    setActiveConversation,
    createConversation,
    addMessage,
    appendToLastMessage,
    updateMessage,
    updateConversation,
    setIsStreaming,
    setError,
  } = useChatStore();
  const { addToast } = useUiStore();

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
      setActiveConversation(convId);
    }

    const userMsg: Message = {
      id: uid(),
      conversationId: convId,
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    addMessage(convId, userMsg);

    const assistantId = uid();
    const assistantMsg: Message = {
      id: assistantId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    addMessage(convId, assistantMsg);

    setIsStreaming(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('conversationId', convId);
      formData.append('model', settings.model);
      formData.append('systemPrompt', settings.systemPrompt || '');
      formData.append('temperature', String(settings.temperature));
      formData.append('topP', String(settings.topP));
      formData.append('maxTokens', String(settings.maxTokens));

      if (files?.length) {
        files.forEach(f => formData.append('files', f));
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          if (json === '[DONE]') break;

          try {
            const chunk: StreamChunk = JSON.parse(json);
            switch (chunk.type) {
              case 'text':
                appendToLastMessage(convId, chunk.content ?? '');
                break;
              case 'tool-call':
                appendToLastMessage(convId, `\n\n*Using ${chunk.toolName ?? 'tool'}...*\n\n`);
                break;
              case 'error':
                setError(chunk.error ?? chunk.content ?? '');
                addToast(chunk.error ?? chunk.content ?? '', 'error');
                break;
              case 'usage':
                updateMessage(convId, assistantId, { tokensIn: chunk.usage?.promptTokens, tokensOut: chunk.usage?.completionTokens });
                break;
              case 'done':
                updateConversation(convId, {
                  title: content.slice(0, 50),
                  tokenCount: (useChatStore.getState().conversations.find(c => c.id === convId)?.tokenCount || 0) + (chunk.usage?.promptTokens ?? 0) + (chunk.usage?.completionTokens ?? 0),
                });
                break;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        addToast(err.message, 'error');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeConversationId, settings, createConversation, setActiveConversation, addMessage, appendToLastMessage, updateMessage, updateConversation, setIsStreaming, setError, addToast]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stop };
}
