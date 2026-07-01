'use client';

import { useState, useEffect } from 'react';
import type { PromptTemplate } from '@/types';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const MODEL_OPTIONS = [
  { value: '', label: 'No model (use default)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; content: string; model?: string; isPublic: boolean; tags: string[] }) => Promise<void>;
  template?: PromptTemplate | null;
  saving?: boolean;
}

export function PromptDialog({ open, onClose, onSave, template, saving }: PromptDialogProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [model, setModel] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; content?: string }>({});

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setModel(template.model || '');
      setIsPublic(template.isPublic);
      setTags(template.tags);
    } else {
      setName('');
      setContent('');
      setModel('');
      setIsPublic(false);
      setTags([]);
    }
    setTagInput('');
    setErrors({});
  }, [template, open]);

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { name?: string; content?: string } = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!content.trim()) errs.content = 'Content is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    await onSave({ name: name.trim(), content: content.trim(), model: model || undefined, isPublic, tags });
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogTitle>{template ? 'Edit Template' : 'New Prompt Template'}</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="e.g. Code Reviewer"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prompt-content">Content</Label>
          <textarea
            id="prompt-content"
            value={content}
            onChange={e => { setContent(e.target.value); setErrors(prev => ({ ...prev, content: undefined })); }}
            placeholder="Write your prompt template here..."
            rows={10}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-model">Model</Label>
            <Select
              id="prompt-model"
              options={MODEL_OPTIONS}
              value={model}
              onChange={e => setModel(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              <span className="text-sm text-muted-foreground">
                {isPublic ? 'Public (visible to everyone)' : 'Private'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prompt-tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="prompt-tags"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type and press Enter to add"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
