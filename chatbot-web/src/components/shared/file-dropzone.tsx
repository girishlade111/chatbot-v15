'use client';

import { useState, useCallback } from 'react';
import { useDropzone, type FileRejection, type FileError } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
}

interface SelectedFile {
  file: File;
  id: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${size} ${units[i]}`;
}

function getFileErrors(file: File, maxSize: number, accept?: Record<string, string[]>): FileError[] {
  const errors: FileError[] = [];
  if (file.size > maxSize) {
    errors.push({
      code: 'file-too-large',
      message: `File exceeds ${formatSize(maxSize)}`,
    });
  }
  if (accept) {
    const allowed = Object.values(accept).flat();
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeMatch = allowed.some((t) => file.type.match(t.replace('/*', '/.+')));
    const extMatch = allowed.some((t) => t === ext);
    if (!mimeMatch && !extMatch && allowed.length > 0) {
      errors.push({
        code: 'file-invalid-type',
        message: 'File type not supported',
      });
    }
  }
  return errors;
}

export function FileDropzone({
  onFilesSelected,
  accept,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
  disabled,
}: FileDropzoneProps) {
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [rejections, setRejections] = useState<FileRejection[]>([]);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejected[]) => {
      setRejections(rejected);

      const validated: File[] = [];
      for (const file of accepted) {
        const errs = getFileErrors(file, maxSize, accept);
        if (errs.length > 0) continue;
        validated.push(file);
      }

      if (!validated.length) return;

      const total = [...selected, ...validated.map((f) => ({ file: f, id: crypto.randomUUID() }))].slice(0, maxFiles);
      setSelected(total);
      onFilesSelected(total.map((s) => s.file));
    },
    [selected, maxFiles, maxSize, accept, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragAccept, isDragReject, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize: maxSize + 1,
    disabled,
    noClick: true,
    noKeyboard: true,
    validator: (file) => {
      const errs = getFileErrors(file, maxSize, accept);
      return errs.length > 0
        ? { code: errs[0].code, message: errs[0].message }
        : null;
    },
  });

  const removeFile = useCallback((id: string) => {
    setSelected((prev) => {
      const next = prev.filter((s) => s.id !== id);
      onFilesSelected(next.map((s) => s.file));
      return next;
    });
  }, [onFilesSelected]);

  const removeRejection = useCallback((index: number) => {
    setRejections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="w-full space-y-2">
      <div
        {...getRootProps()}
        onClick={disabled ? undefined : open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) open();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload files"
        className={cn(
          'relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          isDragAccept && 'border-green-500 bg-green-500/5',
          isDragReject && 'border-destructive bg-destructive/5',
          !isDragActive && 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/30'
        )}
      >
        <input {...getInputProps()} aria-hidden="true" />

        <motion.div
          className="flex flex-col items-center gap-3"
          animate={isDragActive ? { scale: 1.03 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              isDragAccept ? 'bg-green-500/10 text-green-600' :
              isDragReject ? 'bg-destructive/10 text-destructive' :
              'bg-muted text-muted-foreground'
            )}
          >
            <Upload className="h-5 w-5" />
          </div>

          {isDragActive ? (
            <p className="text-sm font-medium text-foreground">
              {isDragAccept ? 'Drop files here' : 'File type not supported'}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                Drag & drop files or <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {maxFiles} files, max {formatSize(maxSize)} each
              </p>
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {rejections.map((rejection, idx) => (
          <motion.div
            key={`rej-${idx}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">
              {rejection.file.name}: {rejection.errors.map((e) => e.message).join(', ')}
            </span>
            <button
              onClick={() => removeRejection(idx)}
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-destructive/10"
              aria-label="Dismiss error"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {selected.length > 0 && (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1.5"
          aria-label="Selected files"
        >
          {selected.map((s) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{s.file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatSize(s.file.size)}</span>
              <Button
                onClick={() => removeFile(s.id)}
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${s.file.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
