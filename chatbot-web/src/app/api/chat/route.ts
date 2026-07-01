import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { orchestrateChat, prepareHistory } from '@/lib/ai/orchestrator';
import { checkUserRateLimit } from '@/lib/utils/rate-limiter';
import { TOKEN_COST_PER_MODEL } from '@/lib/constants';
import { moderateInput } from '@/lib/ai/moderation';

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const rateLimit = await checkUserRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.reset) } });
  }

  const body = await req.json();
  const { message, conversationId, model, systemPrompt, temperature, topP, maxTokens, knowledgeBaseIds } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const moderation = moderateInput(message);
  if (moderation.blocked) {
    return NextResponse.json({ error: moderation.reason }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user || user.banned) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  let dbConversation = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null;

  if (!dbConversation) {
    dbConversation = await prisma.conversation.create({
      data: {
        userId,
        model: model || 'gpt-4o',
        systemPrompt: systemPrompt || '',
        temperature: temperature ?? 0.7,
        topP: topP ?? 1.0,
        maxTokens: maxTokens ?? 4096,
        title: message.slice(0, 100),
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: dbConversation.id,
      role: 'user',
      content: message,
      tokensIn: Math.ceil(message.length / 4),
    },
  });

  const previousMessages = await prisma.message.findMany({
    where: { conversationId: dbConversation.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const history = prepareHistory(
    previousMessages.map(m => ({ role: m.role, content: m.content }))
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const fullContent: string[] = [];
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let error: string | null = null;

      try {
        const generator = orchestrateChat(message, history, {
          modelId: dbConversation!.model,
          systemPrompt,
          temperature,
          topP,
          maxTokens,
          knowledgeBaseIds,
        });

        for await (const chunk of generator) {
          switch (chunk.type) {
            case 'text':
              fullContent.push(chunk.content!);
              controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
              break;
            case 'tool-call':
            case 'tool-result':
              controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
              break;
            case 'usage':
              totalTokensIn = chunk.usage!.promptTokens;
              totalTokensOut = chunk.usage!.completionTokens;
              break;
            case 'error':
              error = chunk.error!;
              controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
              break;
          }
        }
      } catch (e) {
        error = `Stream error: ${(e as Error).message}`;
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error }) + '\n'));
      }

      const combinedContent = fullContent.join('');
      if (combinedContent) {
        await prisma.message.create({
          data: {
            conversationId: dbConversation!.id,
            role: 'assistant',
            content: combinedContent,
            tokensIn: totalTokensIn || Math.ceil(message.length / 4),
            tokensOut: totalTokensOut || Math.ceil(combinedContent.length / 4),
          },
        });

        const modelCost = TOKEN_COST_PER_MODEL[dbConversation!.model] ?? TOKEN_COST_PER_MODEL['gpt-4o'];
        const cost = (totalTokensIn * modelCost.input) + (totalTokensOut * modelCost.output);

        await prisma.usageLog.create({
          data: {
            userId,
            conversationId: dbConversation!.id,
            model: dbConversation!.model,
            provider: dbConversation!.model.startsWith('gpt') ? 'openai' : dbConversation!.model.startsWith('claude') ? 'anthropic' : 'google',
            tokensIn: totalTokensIn || Math.ceil(message.length / 4),
            tokensOut: totalTokensOut || Math.ceil(combinedContent.length / 4),
            costUsd: cost,
            status: error ? 'error' : 'success',
            errorMessage: error || undefined,
          },
        });

        if (dbConversation!.title === 'New Chat') {
          const titleMsg = combinedContent.length > 5 ? combinedContent.slice(0, 100).replace(/\n/g, ' ') + (combinedContent.length > 100 ? '...' : '') : 'New Chat';
          await prisma.conversation.update({
            where: { id: dbConversation!.id },
            data: { title: titleMsg },
          });
        }
      }

      controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', conversationId: dbConversation!.id }) + '\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
