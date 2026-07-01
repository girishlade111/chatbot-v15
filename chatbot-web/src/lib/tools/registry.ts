import type { ToolResult } from '@/types/chat';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

const toolRegistry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

export function getToolDefinitions() {
  return getAllTools().map(t => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool "${name}" not found`);

  const result = await tool.execute(args);
  return { toolCallId: name, name, result };
}
