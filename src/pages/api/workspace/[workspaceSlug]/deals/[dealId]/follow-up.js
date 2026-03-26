import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';
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

  let stripeCustomerId = creator?.customerPayment?.paymentId || null;
  let subscriptionId = creator?.customerPayment?.providerSubscriptionId || null;
  if (!stripeCustomerId && creator?.email) {
    let customerPayment = await getPayment(creator.email);
    if (!customerPayment) {
      await createPaymentAccount(creator.email, creator.id);
      customerPayment = await getPayment(creator.email);
    }
    stripeCustomerId = customerPayment?.paymentId || null;
    subscriptionId = customerPayment?.providerSubscriptionId || null;
  }
  if (!stripeCustomerId) return null;

  const stripe = await getStripe();
  let currency = 'usd';

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

    // 194. Get Unified AI Service
    const { generateChatCompletion } = await import('@/lib/server/ai/index');
    const googleAiApiKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    if (!googleAiApiKey && !openAiApiKey) {
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

    const systemMessage = 'You are a helpful sales assistant.';
    const overageSettings = await getAiOverageSettings();
    let quota = null;
    let overage = null;
    let overageMode = false;
    let tokensEstimated = null;

    const tokensPerDay = Number(limits.aiTokens24h || 0);
    if (Number.isFinite(tokensPerDay) && tokensPerDay > 0) {
      const estimatedPromptTokens = estimateTokens(systemMessage) + estimateTokens(prompt);
      const estimatedTotalTokens = estimatedPromptTokens + 300;
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

    // Call AI Service
    let aiResponseData;
    try {
      aiResponseData = await generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: systemMessage,
        options: {
          model: 'gpt-3.5-turbo', // Fallback for OpenAI
          temperature: 0.7,
          maxTokens: 300
        }
      });
    } catch (err) {
      log({ level: 'error', msg: 'ai_service_error', requestId, workspaceId: workspace.id, error: err.message });
      throw new Error(`AI Service Error: ${err.message}`);
    }

    const message = aiResponseData.content;
    const aiProvider = aiResponseData.provider;
    const aiModel = aiResponseData.model;

    const tokensTotal = Number(aiResponseData.usage?.total_tokens || 0);
    const tokensPrompt = Number(aiResponseData.usage?.prompt_tokens || 0);
    const tokensCompletion = Number(aiResponseData.usage?.completion_tokens || 0);

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
          route: '/api/workspace/[workspaceSlug]/deals/[dealId]/follow-up',
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
        message,
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
    log({ level: 'error', msg: 'ai_follow_up_failed', requestId, workspaceId: workspace?.id, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/deals/[dealId]/follow-up', requestId, workspaceId: workspace?.id });
    res.status(500).json({ error: { msg: 'Unable to generate follow-up' } });
  }
};

export default handler;
