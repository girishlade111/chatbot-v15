'use client';

import { motion } from 'framer-motion';
import type { PromptTemplate } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, Play, Globe, Lock, MessageSquare } from 'lucide-react';

interface PromptCardProps {
  template: PromptTemplate;
  isOwn: boolean;
  onEdit: (t: PromptTemplate) => void;
  onUse: (t: PromptTemplate) => void;
  onDelete: (id: string) => void;
}

export function PromptCard({ template, isOwn, onEdit, onUse, onDelete }: PromptCardProps) {
  const preview = template.content.length > 120
    ? template.content.slice(0, 120) + '...'
    : template.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group flex h-full flex-col transition-shadow hover:shadow-md">
        <CardContent className="flex-1 space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            <Badge
              variant={template.isPublic ? 'secondary' : 'outline'}
              className="shrink-0 gap-1 text-[10px]"
            >
              {template.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {template.isPublic ? 'Public' : 'Private'}
            </Badge>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{preview}</p>

          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {template.model && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {template.model}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {template.usageCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => onUse(template)}>
              <Play className="h-3.5 w-3.5" />
              Use
            </Button>
            {isOwn && (
              <>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(template)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(template.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
