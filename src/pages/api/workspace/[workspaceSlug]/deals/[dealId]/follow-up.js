import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
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

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, dealId } = req.query;
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
    const limits = await getWorkspaceLimits(workspace.id);
    const perDay = limits.aiRequests24h || 15;
    const per5Min = Math.ceil(perDay / 10); // Burst limit proportional to daily limit

    const [rlBurst, rlDaily] = await Promise.all([
      rateLimit({ req, limit: per5Min, windowMs: 5 * 60_000, key: `u:${userId}:ai:follow-up:5m` }),
      rateLimit({ req, limit: perDay, windowMs: 24 * 60 * 60_000, key: `w:${workspace.id}:ai:follow-up:day` }),
    ]);

    if (!rlBurst.ok) {
      log({ level: 'warn', msg: 'ai_follow_up_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    if (!rlDaily.ok) {
      log({ level: 'warn', msg: 'ai_follow_up_quota_exceeded', requestId, workspaceId: workspace.id, userId });
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details: 'Você atingiu a cota diária de IA do seu plano. Faça um upgrade para continuar.',
        },
      });
    }

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId: workspace.id, deletedAt: null },
      include: {
        contact: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!deal) {
      return res.status(404).json({ error: { msg: 'Deal not found' } });
    }

    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(200).json({
        data: {
          message: `Olá ${deal.contact?.name || 'Cliente'},\n\nGostaria de saber se você teve a oportunidade de analisar a nossa proposta referente ao negócio "${deal.name}".\n\nEstou à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\n${session.user.name}`
        }
      });
    }

    const prompt = `
      Você é um assistente de vendas experiente.
      Gere uma mensagem de follow-up curta e profissional para um cliente.
      Contexto do Negócio:
      - Nome do Negócio: ${deal.name}
      - Valor: ${deal.amount || 'N/A'}
      - Cliente: ${deal.contact?.name || 'Cliente'}
      - Última Atividade: ${deal.activities[0]?.title || 'Nenhuma recente'}
      
      A mensagem deve ser educada, direta e incentivar uma resposta.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are a helpful sales assistant." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API Error');
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { message } });

  } catch (error) {
    log({ level: 'error', msg: 'ai_follow_up_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/deals/[dealId]/follow-up', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate follow-up' } });
  }
};

export default handler;
