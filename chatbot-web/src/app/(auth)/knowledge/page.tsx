'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Knowledge Bases</h1>
        <Button>New Knowledge Base</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>No knowledge bases</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create a knowledge base to enable RAG-powered chat with your documents.</p>
        </CardContent>
      </Card>
    </div>
  );
}
