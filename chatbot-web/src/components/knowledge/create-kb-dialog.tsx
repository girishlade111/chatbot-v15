'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CreateKbDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; chunkSize: number; chunkOverlap: number }) => Promise<void>;
}

export function CreateKbDialog({ open, onClose, onSubmit }: CreateKbDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (name.length > 100) errs.name = 'Name must be under 100 characters';
    if (chunkSize < 200 || chunkSize > 2000) errs.chunkSize = 'Must be between 200 and 2000';
    if (chunkOverlap < 0 || chunkOverlap > 500) errs.chunkOverlap = 'Must be between 0 and 500';
    if (chunkOverlap >= chunkSize) errs.chunkOverlap = 'Overlap must be less than chunk size';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, chunkSize, chunkOverlap });
      setName('');
      setDescription('');
      setChunkSize(1000);
      setChunkOverlap(200);
      setErrors({});
      onClose();
    } catch {
      setErrors({ submit: 'Failed to create knowledge base' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>New Knowledge Base</DialogTitle>
      <DialogDescription>Create a knowledge base to store and index your documents for RAG-powered chat.</DialogDescription>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kb-name">Name</Label>
          <Input
            id="kb-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Documents"
            disabled={loading}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb-desc">Description</Label>
          <Input
            id="kb-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chunk-size">Chunk Size: {chunkSize}</Label>
          <input
            id="chunk-size"
            type="range"
            min={200}
            max={2000}
            step={50}
            value={chunkSize}
            onChange={e => setChunkSize(Number(e.target.value))}
            disabled={loading}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>200</span>
            <span>2000</span>
          </div>
          {errors.chunkSize && <p className="text-xs text-destructive">{errors.chunkSize}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="chunk-overlap">Chunk Overlap: {chunkOverlap}</Label>
          <input
            id="chunk-overlap"
            type="range"
            min={0}
            max={500}
            step={10}
            value={chunkOverlap}
            onChange={e => setChunkOverlap(Number(e.target.value))}
            disabled={loading}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>500</span>
          </div>
          {errors.chunkOverlap && <p className="text-xs text-destructive">{errors.chunkOverlap}</p>}
        </div>

        {errors.submit && (
          <p className="text-sm text-destructive">{errors.submit}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
