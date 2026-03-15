import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { getWorkspaceLimits, isModuleAllowed } from '@/lib/server/subscription';
import getStripe from '@/lib/server/stripe';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb',
    },
  },
};

const estimateTokens = (value) => {
  const raw = String(value || '');
  if (!raw) return 0;
  return Math.ceil(raw.length / 4);
};

const parseBool = (value, fallback = false) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['true', '1', 'yes', 'y', 'on'].includes(raw)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(raw)) return false;
  return fallback;
};

const parseNumber = (value, fallback) => {
  const raw = String(value ?? '').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const getAiOverageSettings = async () => {
  const [warnPercentRaw, enabledRaw, requireOptInRaw, priceRaw, maxTokensRaw] = await Promise.all([
    getSystemConfig('AI_QUOTA_WARN_PERCENT', '80'),
    getSystemConfig('AI_OVERAGE_ENABLED', 'false'),
    getSystemConfig('AI_OVERAGE_REQUIRE_OPTIN', 'true'),
    getSystemConfig('AI_OVERAGE_PRICE_PER_1M_TOKENS', '4.00'),
    getSystemConfig('AI_OVERAGE_MAX_TOKENS_24H', '200000'),
  ]);

  const warnPercent = Math.max(0, Math.min(100, parseNumber(warnPercentRaw, 80)));
  const enabled = parseBool(enabledRaw, false);
  const requireOptIn = parseBool(requireOptInRaw, true);
  const pricePer1M = Math.max(0, parseNumber(priceRaw, 4));
  const maxTokens24h = Math.max(0, Math.floor(parseNumber(maxTokensRaw, 200000)));

  return { warnPercent, enabled, requireOptIn, pricePer1M, maxTokens24h };
};

const shouldAllowOverage = (req, settings) => {
  if (!settings?.enabled) return false;
  if (!settings.requireOptIn) return true;
  const header = String(req.headers['x-ai-overage'] || '').trim().toLowerCase();
  return header === 'true' || header === '1' || header === 'yes';
};

const billAiOverage = async ({ workspace, requestId, userId, tokens, pricePer1M }) => {
  const creator = await prisma.user.findUnique({
    where: { id: workspace.creatorId },
    select: {
      id: true,
      email: true,
      customerPayment: { select: { paymentId: true, providerSubscriptionId: true } },
    },
  });

  const stripeCustomerId = creator?.customerPayment?.paymentId || null;
  if (!stripeCustomerId) return null;

  const stripe = await getStripe();
  let currency = 'usd';

  const subscriptionId = creator?.customerPayment?.providerSubscriptionId || null;
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(String(subscriptionId));
      const c = sub?.items?.data?.[0]?.price?.currency || null;
      if (c) currency = String(c);
    } catch { }
  }

  const amount = Math.ceil((Number(tokens) * Number(pricePer1M) * 100) / 1_000_000);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const invoiceItem = await stripe.invoiceItems.create({
    customer: stripeCustomerId,
    ...(subscriptionId ? { subscription: String(subscriptionId) } : {}),
    currency,
    amount,
    description: `AI overage (${Number(tokens)} tokens) - workspace ${workspace.slug}`,
    metadata: {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      requestId: requestId || '',
      userId: String(userId || ''),
      tokens: String(tokens),
      pricePer1M: String(pricePer1M),
    },
  });

  return {
    currency,
    amount,
    stripeCustomerId,
    subscriptionId,
    invoiceItemId: invoiceItem?.id || null,
  };
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

  const aiEnabled = await isModuleAllowed(workspace.id, 'ai_assistant');
  if (!aiEnabled) {
    return res.status(403).json({ error: { msg: 'AI Assistant module is not available in your current plan.' } });
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
        contact: {
          include: {
            conversations: {
              where: { deletedAt: null },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              include: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 5
                }
              }
            }
          }
        }
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

    const dealsSummary = deals.map(d => {
      const lastMessages = d.contact?.conversations?.[0]?.messages?.map(m => `[${m.direction}] ${m.content.slice(0, 100)}`).join('\n') || 'No messages';
      return `Deal ID: ${d.id}, Name: ${d.name}, Amount: ${d.amount}, Stage: ${d.stage.name}, Last Messages:\n${lastMessages}`;
    }).join('\n\n');

    const prompt = `
      Analyze this sales pipeline and provide:
      1. Strategic insights (short, max 3 points).
      2. For each deal, predict the success probability (0-100%) and identify if it needs urgent follow-up.

      Company Context:
      ${workspace.aiContext || 'No specific context provided.'}

      Pipeline Summary:
      ${stagesSummary}
      
      Deals Data:
      ${dealsSummary}
      
      Return the result as a raw JSON object with this structure:
      {
        "insights": "General strategic analysis...",
        "deals": [
          { "id": "deal-id", "probability": number, "urgency": "low" | "medium" | "high", "reason": "short explanation" }
        ]
      }
      Only return the JSON.
    `;

    const systemMessage = 'You are an expert sales analyst and manager.';
    const overageSettings = await getAiOverageSettings();
    let quota = null;
    let overage = null;
    let overageMode = false;
    let tokensEstimated = null;

    const tokensPerDay = Number(limits.aiTokens24h || 0);
    if (Number.isFinite(tokensPerDay) && tokensPerDay > 0) {
      const estimatedPromptTokens = estimateTokens(systemMessage) + estimateTokens(prompt);
      const estimatedTotalTokens = estimatedPromptTokens + 400;
      tokensEstimated = estimatedTotalTokens;

      const rlTokens = await rateLimit({
        req,
        limit: tokensPerDay,
        windowMs: 24 * 60 * 60_000,
        key: `w:${workspace.id}:ai:tokens:day`,
        increment: estimatedTotalTokens,
      });

      const used = Math.max(0, tokensPerDay - Math.max(0, rlTokens.remaining || 0));
      const percentUsed = tokensPerDay > 0 ? Math.min(100, Math.round((used / tokensPerDay) * 100)) : 0;
      quota = {
        tokens: {
          limit: tokensPerDay,
          remaining: Math.max(0, rlTokens.remaining || 0),
          resetAt: rlTokens.resetAt || null,
          percentUsed,
          warn: percentUsed >= overageSettings.warnPercent && overageSettings.warnPercent > 0,
        },
      };

      if (!rlTokens.ok) {
        const canContinue = shouldAllowOverage(req, overageSettings) && overageSettings.maxTokens24h > 0;
        overage = {
          enabled: overageSettings.enabled,
          requireOptIn: overageSettings.requireOptIn,
          pricePer1M: overageSettings.pricePer1M,
          maxTokens24h: overageSettings.maxTokens24h,
          canContinue,
        };

        if (!canContinue) {
          log({ level: 'warn', msg: 'ai_tokens_quota_exceeded', requestId, workspaceId: workspace.id, userId });
          return res.status(403).json({
            error: {
              msg: 'LIMIT_REACHED',
              details: 'Você atingiu a cota diária de tokens de IA do seu plano.',
              quota,
              overage,
            },
          });
        }

        const rlOverage = await rateLimit({
          req,
          limit: overageSettings.maxTokens24h,
          windowMs: 24 * 60 * 60_000,
          key: `w:${workspace.id}:ai:tokens_overage:day`,
          increment: estimatedTotalTokens,
        });

        if (!rlOverage.ok) {
          log({ level: 'warn', msg: 'ai_overage_tokens_quota_exceeded', requestId, workspaceId: workspace.id, userId });
          return res.status(403).json({
            error: {
              msg: 'LIMIT_REACHED',
              details: 'Você atingiu o teto diário de overage de IA.',
              quota,
              overage,
            },
          });
        }

        overageMode = true;
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
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
    let result = { insights: "Unable to parse AI response", deals: [] };

    try {
      const content = data.choices[0]?.message?.content?.trim();
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/^```json\n?/, '').replace(/```$/, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      log({ level: 'error', msg: 'ai_insights_parse_error', requestId, workspaceId: workspace.id, error: e.message });
      result.insights = data.choices[0]?.message?.content?.trim();
    }

    const tokensTotal = Number(data?.usage?.total_tokens || 0);
    const tokensPrompt = Number(data?.usage?.prompt_tokens || 0);
    const tokensCompletion = Number(data?.usage?.completion_tokens || 0);

    let billingResult = null;
    if (overageMode && Number.isFinite(tokensTotal) && tokensTotal > 0) {
      try {
        billingResult = await billAiOverage({
          workspace,
          requestId,
          userId,
          tokens: tokensTotal,
          pricePer1M: overageSettings.pricePer1M,
        });
      } catch (error) {
        log({ level: 'error', msg: 'ai_overage_billing_failed', requestId, workspaceId: workspace.id, userId, error });
      }
    }

    if (Number.isFinite(tokensTotal) && tokensTotal > 0) {
      prisma.aiUsageEvent?.create?.({
        data: {
          workspaceId: workspace.id,
          userId: userId || null,
          requestId,
          route: '/api/workspace/[workspaceSlug]/pipelines/[pipelineId]/insights',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          tokensTotal: Math.max(0, Math.floor(tokensTotal)),
          tokensPrompt: Number.isFinite(tokensPrompt) && tokensPrompt > 0 ? Math.floor(tokensPrompt) : null,
          tokensCompletion: Number.isFinite(tokensCompletion) && tokensCompletion > 0 ? Math.floor(tokensCompletion) : null,
          tokensEstimated: Number.isFinite(tokensEstimated) && tokensEstimated > 0 ? Math.floor(tokensEstimated) : null,
          overageMode,
          billedAmount: billingResult?.amount ?? null,
          billedCurrency: billingResult?.currency ?? null,
          stripeCustomerId: billingResult?.stripeCustomerId ?? null,
          stripeSubscriptionId: billingResult?.subscriptionId ?? null,
          stripeInvoiceItemId: billingResult?.invoiceItemId ?? null,
        },
      })
        ?.catch((error) => {
          log({
            level: 'error',
            msg: 'ai_usage_log_failed',
            requestId,
            workspaceId: workspace.id,
            userId,
            error,
          });
        });
    }

    res.status(200).json({
      data: {
        ...result,
        provider: 'openai',
        quota,
        overage: overage || {
          enabled: overageSettings.enabled,
          requireOptIn: overageSettings.requireOptIn,
          pricePer1M: overageSettings.pricePer1M,
          maxTokens24h: overageSettings.maxTokens24h,
          canContinue: shouldAllowOverage(req, overageSettings) && overageSettings.maxTokens24h > 0,
        },
      },
    });

  } catch (error) {
    log({ level: 'error', msg: 'ai_pipeline_insights_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/pipelines/[pipelineId]/insights', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate insights' } });
  }
};

export default handler;
