'use client';

import type { PromptTemplate } from '@/types';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Globe, Lock } from 'lucide-react';

interface UsePromptDialogProps {
  open: boolean;
  onClose: () => void;
  template: PromptTemplate | null;
  onApply: (t: PromptTemplate) => void;
  applying?: boolean;
}

export function UsePromptDialog({ open, onClose, template, onApply, applying }: UsePromptDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Use Template</DialogTitle>
      <DialogDescription>Apply this prompt template to your current chat's system prompt.</DialogDescription>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{template.name}</h3>
          <Badge variant={template.isPublic ? 'secondary' : 'outline'} className="gap-1 text-[10px]">
            {template.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {template.isPublic ? 'Public' : 'Private'}
          </Badge>
        </div>

        {template.model && (
          <Badge variant="outline" className="text-[11px] font-normal">
            {template.model}
          </Badge>
        )}

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {template.content}
          </pre>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={applying}>Cancel</Button>
          <Button onClick={() => onApply(template)} disabled={applying} className="gap-1.5">
            <Check className="h-4 w-4" />
            {applying ? 'Applying...' : 'Apply to Current Chat'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
