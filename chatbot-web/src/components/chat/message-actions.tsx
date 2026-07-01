'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Edit3, GitBranch, RotateCcw, Trash2, Check } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  onEdit: () => void;
  onFork: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  isUser: boolean;
  isLast?: boolean;
}

export function MessageActions({
  content,
  onEdit,
  onFork,
  onRegenerate,
  onDelete,
  isUser,
  isLast,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background/80 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/message:opacity-100">
      <Button
        onClick={handleCopy}
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title="Copy message"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      {isUser && (
        <Button
          onClick={onEdit}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Edit message"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        onClick={onFork}
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title="Fork conversation from here"
      >
        <GitBranch className="h-3.5 w-3.5" />
      </Button>
      {isLast && !isUser && (
        <Button
          onClick={onRegenerate}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Regenerate response"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        onClick={onDelete}
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        title="Delete message and subsequent"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
