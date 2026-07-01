'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, FileText, Image, FileArchive, Film, Trash2, Upload, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Document } from '@/types';

const ACCEPTED_TYPES = '.txt,.md,.pdf,.doc,.docx,.csv,.json,.xml,.html,.htm,.py,.js,.ts,.jsx,.tsx,.yaml,.yml,.toml';

interface DocumentListProps {
  documents: Document[];
  knowledgeBaseId: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return FileArchive;
  if (mimeType.includes('pdf')) return FileText;
  return File;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface StatusMeta {
  label: string;
  variant: 'outline' | 'secondary' | 'default' | 'destructive';
  icon: typeof Clock;
}
const STATUS_MAP: Record<Document['status'], StatusMeta> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'secondary', icon: Loader2 },
  READY: { label: 'Ready', variant: 'default', icon: CheckCircle2 },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
};

export function DocumentList({ documents, knowledgeBaseId, onUpload, onDelete }: DocumentListProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [onUpload]);

  const handleDelete = useCallback(async (docId: string) => {
    setDeleting(docId);
    try {
      await onDelete(docId);
    } finally {
      setDeleting(null);
    }
  }, [onDelete]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Documents ({documents.length})
        </p>
        <div className="relative">
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES}
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No documents yet. Upload a file to populate this knowledge base.
        </p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {documents.map((doc) => {
              const statusMeta = STATUS_MAP[doc.status];
              const Icon = getFileIcon(doc.mimeType);
              const StatusIcon = statusMeta.icon;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{doc.originalName}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatSize(doc.sizeBytes)}</span>
                      {doc.chunkCount > 0 && <span>{doc.chunkCount} chunks</span>}
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>

                  <Badge
                    variant={statusMeta.variant}
                    className={cn(
                      'shrink-0 gap-1',
                      doc.status === 'PROCESSING' && 'animate-pulse'
                    )}
                  >
                    <StatusIcon className={cn(
                      'h-3 w-3',
                      doc.status === 'PROCESSING' && 'animate-spin'
                    )} />
                    {statusMeta.label}
                  </Badge>

                  {doc.errorMessage && (
                    <span className="hidden max-w-[200px] truncate text-xs text-destructive sm:block" title={doc.errorMessage}>
                      {doc.errorMessage}
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id || doc.status === 'PROCESSING'}
                  >
                    {deleting === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
