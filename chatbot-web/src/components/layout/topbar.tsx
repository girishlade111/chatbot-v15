'use client';

import { useUiStore } from '@/stores/ui-store';
import { useTheme } from '@/providers/theme-provider';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const { toggleSidebar } = useUiStore();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-3">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Toggle sidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
      </Button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </Button>
        {session?.user && (
          <span className="text-xs text-muted-foreground">{session.user.email}</span>
        )}
      </div>
    </header>
  );
}
