'use client';

import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

export default function SettingsPage() {
  const { settings, setSettings } = useChatStore();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Model</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Model</Label>
            <select
              value={settings.model}
              onChange={e => setSettings({ model: e.target.value })}
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Temperature: {settings.temperature}</Label>
            <Slider min={0} max={2} step={0.1} value={settings.temperature} onChange={e => setSettings({ temperature: parseFloat(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Top P: {settings.topP}</Label>
            <Slider min={0} max={1} step={0.05} value={settings.topP} onChange={e => setSettings({ topP: parseFloat(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens: {settings.maxTokens}</Label>
            <Slider min={256} max={16384} step={256} value={settings.maxTokens} onChange={e => setSettings({ maxTokens: parseInt(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Chat</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>System Prompt</Label>
            <textarea
              value={settings.systemPrompt}
              onChange={e => setSettings({ systemPrompt: e.target.value })}
              placeholder="Optional system prompt..."
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Knowledge Bases</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No knowledge bases configured.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="default">Save Preferences</Button>
      </div>
    </div>
  );
}
