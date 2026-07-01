'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Trash2, ChevronDown, ChevronRight, Database, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentList } from './document-list';
import type { KnowledgeBase, Document } from '@/types';

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
  onDelete: (id: string) => void;
  onUpload: (kbId: string, file: File) => Promise<void>;
  onDeleteDocument: (kbId: string, docId: string) => Promise<void>;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function countByStatus(docs: Document[]): { pending: number; processing: number; ready: number; failed: number } {
  return {
    pending: docs.filter(d => d.status === 'PENDING').length,
    processing: docs.filter(d => d.status === 'PROCESSING').length,
    ready: docs.filter(d => d.status === 'READY').length,
    failed: docs.filter(d => d.status === 'FAILED').length,
  };
}

export function KnowledgeBaseCard({ knowledgeBase, onDelete, onUpload, onDeleteDocument }: KnowledgeBaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kb = knowledgeBase;
  const counts = countByStatus(kb.documents);

  return (
    <Card className={cn('transition-shadow hover:shadow-md', expanded && 'shadow-md')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{kb.name}</CardTitle>
              {kb.description && (
                <CardDescription className="mt-0.5 truncate">{kb.description}</CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Hide documents' : 'Show documents'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { onDelete(kb.id); setConfirmDelete(false); }}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setConfirmDelete(false)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>{kb.documents.length} document{kb.documents.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {counts.ready > 0 && (
              <Badge variant="default" className="h-5 gap-1 px-1.5 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                {counts.ready}
              </Badge>
            )}
            {counts.processing > 0 && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                {counts.processing}
              </Badge>
            )}
            {counts.pending > 0 && (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-xs">
                <Clock className="h-3 w-3" />
                {counts.pending}
              </Badge>
            )}
            {counts.failed > 0 && (
              <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-xs">
                <AlertCircle className="h-3 w-3" />
                {counts.failed}
              </Badge>
            )}
          </div>

          <span className="text-xs">
            Chunk: {kb.chunkSize} | Overlap: {kb.chunkOverlap}
          </span>

          <span className="ml-auto text-xs">
            Updated {formatDate(kb.updatedAt)}
          </span>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 border-t pt-4"
            >
              <DocumentList
                documents={kb.documents}
                knowledgeBaseId={kb.id}
                onUpload={(file) => onUpload(kb.id, file)}
                onDelete={(docId) => onDeleteDocument(kb.id, docId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
