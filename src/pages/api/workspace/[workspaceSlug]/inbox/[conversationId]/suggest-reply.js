import { validateSession } from '@/config/api-validation';
import { getConversation } from '@/prisma/services/conversation';
import { getWorkspace } from '@/prisma/services/workspace';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { getWorkspaceLimits } from '@/lib/server/subscription';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb',
    },
  },
};

const clampText = (value, maxLen) => {
  const raw = String(value || '');
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, maxLen);
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, conversationId } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const userId = session.user.userId || session.user.id;
    const limits = await getWorkspaceLimits(workspace.id);
    const perDay = limits.aiRequests24h || 15;
    const per5Min = Math.ceil(perDay / 10); // Burst limit proportional to daily limit

    const [rlBurst, rlDaily] = await Promise.all([
      rateLimit({ req, limit: per5Min, windowMs: 5 * 60_000, key: `u:${userId}:ai:suggest-reply:5m` }),
      rateLimit({ req, limit: perDay, windowMs: 24 * 60 * 60_000, key: `w:${workspace.id}:ai:suggest-reply:day` }),
    ]);

    if (!rlBurst.ok) {
      log({ level: 'warn', msg: 'ai_suggest_reply_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    if (!rlDaily.ok) {
      log({ level: 'warn', msg: 'ai_suggest_reply_quota_exceeded', requestId, workspaceId: workspace.id, userId });
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details: 'Você atingiu a cota diária de IA do seu plano. Faça um upgrade para continuar.',
        },
      });
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    if (conversation.workspaceId !== workspace.id) {
      return res.status(403).json({ error: { msg: 'Access denied' } });
    }

    const { getSystemConfig } = await import('@/lib/server/config');
    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      return res.status(400).json({ error: { msg: 'OpenAI API key is missing. Please configure it in Super Admin settings.' } });
    }

    // Format messages for OpenAI
    // INBOUND (from contact) -> user
    // OUTBOUND (from us) -> assistant
    const messages = conversation.messages.map(m => ({
      role: m.direction === 'OUTBOUND' ? 'assistant' : 'user',
      content: clampText(m.content, 2000)
    }));

    const systemPrompt = `You are a helpful customer support assistant for ${workspace.name}. 
    Your goal is to help the customer with their inquiries in a professional, friendly, and concise manner.
    Draft a response to the last message from the user. Do not include placeholders like "[Your Name]".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10) // Context window of last 10 messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      log({ level: 'error', msg: 'ai_suggest_reply_provider_error', requestId, workspaceId: workspace.id, status: response.status });
      return res.status(500).json({ error: { msg: 'Failed to generate response from AI provider' } });
    }

    const data = await response.json();
    const suggestion = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { suggestion } });

  } catch (error) {
    log({ level: 'error', msg: 'ai_suggest_reply_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]/suggest-reply', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate response' } });
  }
};

export default handler;
