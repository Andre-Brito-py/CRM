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
  const { workspaceSlug, pipelineId } = req.query;
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
      rateLimit({ req, limit: per5Min, windowMs: 5 * 60_000, key: `u:${userId}:ai:pipeline-insights:5m` }),
      rateLimit({ req, limit: perDay, windowMs: 24 * 60 * 60_000, key: `w:${workspace.id}:ai:pipeline-insights:day` }),
    ]);

    if (!rlBurst.ok) {
      log({ level: 'warn', msg: 'ai_pipeline_insights_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    if (!rlDaily.ok) {
      log({ level: 'warn', msg: 'ai_pipeline_insights_quota_exceeded', requestId, workspaceId: workspace.id, userId });
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details: 'Você atingiu a cota diária de IA do seu plano. Faça um upgrade para continuar.',
        },
      });
    }

    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, workspaceId: workspace.id, deletedAt: null },
      include: {
        stages: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!pipeline) {
      return res.status(404).json({ error: { msg: 'Pipeline not found' } });
    }

    const deals = await prisma.deal.findMany({
      where: {
        workspaceId: workspace.id,
        stage: { pipelineId },
        deletedAt: null
      },
      include: {
        stage: true,
        contact: true
      }
    });

    if (deals.length === 0) {
      return res.status(200).json({ data: { insights: "No deals found in this pipeline to analyze." } });
    }

    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!openAiApiKey) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return res.status(200).json({
        data: {
          insights: `**Análise do Pipeline ${pipeline.name}**\n\n- Você tem ${deals.length} negócios ativos.\n- O valor total do pipeline é de ${deals.reduce((acc, d) => acc + Number(d.amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n- Sugestão: Foque nos negócios da etapa "${pipeline.stages[0]?.name}" que estão parados há mais de 7 dias.`
        }
      });
    }

    // Aggregate data for AI
    const stagesSummary = pipeline.stages.map(stage => {
      const stageDeals = deals.filter(d => d.stageId === stage.id);
      const totalValue = stageDeals.reduce((acc, d) => acc + Number(d.amount || 0), 0);
      return `- ${stage.name}: ${stageDeals.length} negócios, Valor Total: ${totalValue}`;
    }).join('\n');

    const prompt = `
      Analise os dados deste pipeline de vendas e forneça insights estratégicos curtos (máx 3 pontos).
      Nome do Pipeline: ${pipeline.name}
      Resumo por Estágio:
      ${stagesSummary}
      
      Total de Negócios: ${deals.length}
      
      Destaque gargalos ou oportunidades.
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
          { role: 'system', content: "You are a sales manager analyst." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API Error');
    }

    const data = await response.json();
    const insights = data.choices[0]?.message?.content?.trim();

    res.status(200).json({ data: { insights } });

  } catch (error) {
    log({ level: 'error', msg: 'ai_pipeline_insights_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/pipelines/[pipelineId]/insights', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate insights' } });
  }
};

export default handler;
