'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useUiStore } from '@/stores/ui-store';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Plus, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import type { PromptTemplate } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PromptCard, PromptDialog, UsePromptDialog } from '@/components/prompts';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useDebounce } from '@/hooks/use-debounce';

type PageState = 'loading' | 'error' | 'empty' | 'populated';

export default function PromptsPage() {
  const { data: session } = useSession();
  const { setSettings } = useChatStore();
  const { addToast } = useUiStore();
  const isMobile = !useMediaQuery('(min-width: 768px)');

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [state, setState] = useState<PageState>('loading');
  const [search, setSearch] = useState('');
  const [showPublic, setShowPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [useTarget, setUseTarget] = useState<PromptTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const debouncedSearch = useDebounce(search, 250);

  const fetchTemplates = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`/api/prompts${showPublic ? '?public=true' : ''}`);
      if (!res.ok) throw new Error('Failed to load templates');
      const json = await res.json();
      if (!json.templates?.length) {
        setState('empty');
      } else {
        setTemplates(json.templates);
        setState('populated');
      }
    } catch {
      setState('error');
    }
  }, [showPublic]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter(t => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });

  const ownId = session?.user ? (session.user as { id: string }).id : '';

  const openCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEdit = (t: PromptTemplate) => {
    setEditingTemplate(t);
    setDialogOpen(true);
  };

  const openUse = (t: PromptTemplate) => {
    setUseTarget(t);
    setUseDialogOpen(true);
  };

  const handleSave = async (data: { name: string; content: string; model?: string; isPublic: boolean; tags: string[] }) => {
    setSaving(true);
    try {
      if (editingTemplate) {
        const res = await fetch(`/api/prompts?id=${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update');
        toast.success('Template updated');
      } else {
        const res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create');
        toast.success('Template created');
      }
      setDialogOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt template?')) return;
    try {
      const res = await fetch(`/api/prompts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Template deleted');
      await fetchTemplates();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleApply = async (t: PromptTemplate) => {
    setApplying(true);
    try {
      setSettings({ systemPrompt: t.content });
      await fetch(`/api/prompts?id=${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usageCount: t.usageCount + 1 }),
      });
      toast.success(`Applied "${t.name}" as system prompt`);
      setUseDialogOpen(false);
      setUseTarget(null);
      fetchTemplates();
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mx-auto h-full max-w-5xl space-y-5 overflow-y-auto p-4 pb-8 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prompt Templates</h1>
          <p className="text-sm text-muted-foreground">
            {state === 'populated' && `${filtered.length} of ${templates.length} templates`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 self-start">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, content, or tags..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showPublic}
              onChange={e => setShowPublic(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Include public
          </label>
          <Button variant="ghost" size="icon" onClick={fetchTemplates} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {state === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border bg-card p-5">
              <div className="mb-3 h-4 w-3/4 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load templates.</p>
          <Button variant="outline" onClick={fetchTemplates} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </motion.div>
      )}

      {state === 'empty' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-20 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No prompt templates yet. Create your first template.</p>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </motion.div>
      )}

      {state === 'populated' && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm text-muted-foreground">No templates match your search.</p>
              <Button variant="link" onClick={() => setSearch('')}>Clear search</Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(t => (
                <PromptCard
                  key={t.id}
                  template={t}
                  isOwn={t.userId === ownId}
                  onEdit={openEdit}
                  onUse={openUse}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      <PromptDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTemplate(null); }}
        onSave={handleSave}
        template={editingTemplate}
        saving={saving}
      />

      <UsePromptDialog
        open={useDialogOpen}
        onClose={() => { setUseDialogOpen(false); setUseTarget(null); }}
        template={useTarget}
        onApply={handleApply}
        applying={applying}
      />
    </div>
  );
}
