'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PromptsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prompt Templates</h1>
        <Button>New Template</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>No templates</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Save reusable prompt templates for quick access.</p>
        </CardContent>
      </Card>
    </div>
  );
}
