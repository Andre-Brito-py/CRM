import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { getSubscriptionStatus } from '@/lib/server/subscription';

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

const buildTranscript = (messages, contactName) => {
  const lines = [];
  for (const msg of messages) {
    const role = msg.direction === 'OUTBOUND' ? 'Agente' : (contactName || 'Cliente');
    const content = clampText(msg.content, 700);
    lines.push(`${role}: ${content}`);
  }
  const transcript = lines.join('\n');
  return clampText(transcript, 12_000);
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

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  try {
    const userId = session.user.userId || session.user.id;
    const plan = await getSubscriptionStatus(workspace?.creator?.email || session.user.email);
    const per5Min =
      plan === 'FREE' ? 6 : plan === 'STANDARD' ? 20 : 120;
    const perDay =
      plan === 'FREE' ? 15 : plan === 'STANDARD' ? 120 : 1200;

    const [rlBurst, rlDaily] = await Promise.all([
      rateLimit({ req, limit: per5Min, windowMs: 5 * 60_000, key: `u:${userId}:ai:summarize:5m` }),
      rateLimit({ req, limit: perDay, windowMs: 24 * 60 * 60_000, key: `w:${workspace.id}:ai:summarize:day` }),
    ]);

    if (!rlBurst.ok) {
      log({ level: 'warn', msg: 'ai_summarize_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    if (!rlDaily.ok) {
      log({ level: 'warn', msg: 'ai_summarize_quota_exceeded', requestId, workspaceId: workspace.id, userId });
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details: 'Você atingiu a cota diária de IA do seu plano. Faça um upgrade para continuar.',
        },
      });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId: workspace.id },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Last 50 messages for summary
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: { msg: 'Conversation not found' } });
    }

    if (conversation.messages.length === 0) {
      return res.status(200).json({ data: { summary: 'No messages to summarize yet.' } });
    }

    const transcript = buildTranscript(conversation.messages, conversation.contact?.name);

    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const contact = conversation.contact?.name || 'o cliente';
      const msgCount = conversation.messages.length;
      const inbound = conversation.messages.filter(m => m.direction === 'INBOUND').length;
      const outbound = conversation.messages.filter(m => m.direction === 'OUTBOUND').length;

      return res.status(200).json({
        data: {
          summary: `**Resumo da Conversa com ${contact}**\n\n` +
            `• ${msgCount} mensagens no total (${inbound} recebidas, ${outbound} enviadas).\n` +
            `• Última mensagem: "${conversation.messages[conversation.messages.length - 1]?.content?.slice(0, 80)}..."\n` +
            `• Status atual: ${conversation.status || 'Aberta'}.\n\n` +
            `_Adicione sua chave OpenAI nas configurações do sistema para obter resumos com IA._`
        }
      });
    }

    const prompt = `Resuma esta conversa de atendimento ao cliente em 3-5 pontos concisos. Identifique: (1) o problema ou necessidade principal, (2) o que foi dito/prometido, e (3) o próximo passo recomendado. Seja objetivo.\n\nTranscrição:\n${transcript}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um agente de suporte senior analisando conversas. Responda sempre em Português.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });

    if (!response.ok) throw new Error('OpenAI API Error');

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { summary } });

  } catch (error) {
    log({ level: 'error', msg: 'ai_summarize_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/inbox/[conversationId]/summarize', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate summary' } });
  }
};

export default handler;
