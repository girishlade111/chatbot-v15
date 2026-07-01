import { registerTool } from './registry';

registerTool({
  name: 'calculator',
  description: 'Perform mathematical calculations. Supports all basic math operations.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(144) * 3.14")',
      },
    },
    required: ['expression'],
  },
  execute: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      const numResult = Number(result);
      if (!isFinite(numResult)) throw new Error('Invalid result');
      return { expression, result: numResult };
    } catch (e) {
      return { expression, error: `Failed to evaluate: ${(e as Error).message}` };
    }
  },
});
