import { registerTool } from './registry';

registerTool({
  name: 'web_search',
  description: 'Search the web for real-time information. Use this for current events, recent data, or any query needing up-to-date information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of search results (default: 5)',
        default: 5,
      },
    },
    required: ['query'],
  },
  execute: async ({ query, maxResults }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return { error: 'Web search not configured (missing TAVILY_API_KEY)' };

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults || 5, include_summary: true }),
    });

    if (!res.ok) return { error: `Search failed: ${res.statusText}` };

    const data = await res.json();
    return {
      query,
      results: (data.results || []).map((r: { title: string; url: string; content: string; summary?: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.summary || r.content,
      })),
    };
  },
});
