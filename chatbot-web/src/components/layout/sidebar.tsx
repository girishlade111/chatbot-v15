'use client';

import { useChatStore } from '@/stores/chat-store';
import { useUiStore } from '@/stores/ui-store';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/use-debounce';
import { useMemo } from 'react';
import Link from 'next/link';

export function Sidebar() {
  const { conversations, activeConversationId, setActiveConversation, createConversation, deleteConversation, updateConversation } = useChatStore();
  const { sidebarOpen, toggleSidebar, searchQuery, setSearchQuery } = useUiStore();
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const debouncedSearch = useDebounce(searchQuery, 200);

  const filtered = useMemo(() =>
    conversations.filter(c =>
      !debouncedSearch || c.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [conversations, debouncedSearch]
  );

  const visible = isMobile ? sidebarOpen : true;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'flex h-full flex-col border-r bg-sidebar transition-all duration-300',
        visible ? 'w-72' : 'w-0 overflow-hidden'
      )}>
        <div className="flex items-center gap-2 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">C</div>
          <span className="font-semibold">ChatBot</span>
        </div>

        <div className="px-3 pb-2">
          <Button onClick={() => { const id = createConversation(); setActiveConversation(id); }} className="w-full justify-start gap-2" size="sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5v14" /></svg>
            New Chat
          </Button>
        </div>

        <div className="px-3 pb-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {filtered.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">No conversations yet</p>
          )}
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={cn(
                'group relative w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                activeConversationId === conv.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <span className="truncate">{conv.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{conv.messages.length} messages</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </button>
          ))}
        </div>

        <Separator />

        <div className="p-2">
          <Link
            href="/billing"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a6 6 0 0 0-12 0" /></svg>
            Billing
          </Link>
        </div>

        <Separator />

        <div className="p-3 text-xs text-muted-foreground">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </aside>
    </>
  );
}
