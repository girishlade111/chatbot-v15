'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, AlertCircle, Database, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KnowledgeBaseCard, CreateKbDialog } from '@/components/knowledge';
import type { KnowledgeBase } from '@/types';

function hasInProgress(doc: { status: string }[]): boolean {
  return doc.some(d => d.status === 'PENDING' || d.status === 'PROCESSING');
}

async function fetchKbs(): Promise<KnowledgeBase[]> {
  const res = await fetch('/api/knowledge');
  if (!res.ok) throw new Error('Failed to fetch knowledge bases');
  const data = await res.json();
  return data.knowledgeBases as KnowledgeBase[];
}

async function createKb(data: { name: string; description?: string; chunkSize: number; chunkOverlap: number }): Promise<void> {
  const res = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create knowledge base');
  }
}

async function deleteKb(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete knowledge base');
}

async function uploadDocument(kbId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('knowledgeBaseId', kbId);

  const res = await fetch('/api/knowledge/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
}

async function deleteDocument(_kbId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/knowledge/document?id=${encodeURIComponent(docId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pollingRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchKbs();
      setKnowledgeBases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasPending = knowledgeBases.some(kb => hasInProgress(kb.documents));
    if (!hasPending) {
      pollingRef.current = false;
      return;
    }

    pollingRef.current = true;
    const interval = setInterval(async () => {
      try {
        const data = await fetchKbs();
        setKnowledgeBases(data);
        if (!data.some(kb => hasInProgress(kb.documents))) {
          pollingRef.current = false;
          clearInterval(interval);
        }
      } catch {
        // Silently retry on next tick
      }
    }, 3000);

    return () => {
      pollingRef.current = false;
      clearInterval(interval);
    };
  }, [knowledgeBases]);

  const handleCreate = useCallback(async (data: { name: string; description?: string; chunkSize: number; chunkOverlap: number }) => {
    await createKb(data);
    toast.success('Knowledge base created');
    await loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteKb(id);
    toast.success('Knowledge base deleted');
    setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
  }, []);

  const handleUpload = useCallback(async (kbId: string, file: File) => {
    await uploadDocument(kbId, file);
    toast.success(`${file.name} uploaded`);
    const data = await fetchKbs();
    setKnowledgeBases(data);
  }, []);

  const handleDeleteDocument = useCallback(async (kbId: string, docId: string) => {
    await deleteDocument(kbId, docId);
    toast.success('Document deleted');
    setKnowledgeBases(prev =>
      prev.map(kb =>
        kb.id === kbId
          ? { ...kb, documents: kb.documents.filter(d => d.id !== docId) }
          : kb
      )
    );
  }, []);

  return (
    <div className="mx-auto h-full max-w-5xl space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Bases</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents and enable RAG-powered chat with your content.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Knowledge Base
        </Button>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-2/3 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Failed to load</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && knowledgeBases.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">No knowledge bases yet</h2>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Create one to enable RAG-powered chat with your documents, PDFs, and code files.
            </p>
            <Button className="mt-6" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Knowledge Base
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && knowledgeBases.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          {knowledgeBases.map(kb => (
            <motion.div key={kb.id} variants={item}>
              <KnowledgeBaseCard
                knowledgeBase={kb}
                onDelete={handleDelete}
                onUpload={handleUpload}
                onDeleteDocument={handleDeleteDocument}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreateKbDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
