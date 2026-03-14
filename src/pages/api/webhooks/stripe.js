import { buffer } from 'micro';
import getStripe from '@/lib/server/stripe';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const requestId = String(req.headers['x-request-id'] || '').trim() || null;
    const rl = await rateLimit({ req, limit: 200, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'stripe_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const buf = await buffer(req);
    if (buf.length > 2_000_000) {
      log({ level: 'warn', msg: 'stripe_webhook_payload_too_large', requestId, bytes: buf.length });
      return res.status(413).send('Payload Too Large');
    }
    const sig = req.headers['stripe-signature'];
    const webhookSecret = await getSystemConfig('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET);

    let event;

    try {
      if (!sig || !webhookSecret) return res.status(400).send('Missing signature or secret');
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      log({ level: 'warn', msg: 'stripe_webhook_invalid_signature', requestId });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const dataObjectId = event?.data?.object?.id ? String(event.data.object.id) : null;
    const dataObjectType = event?.data?.object?.object ? String(event.data.object.object) : null;

    try {
      await prisma.stripeEvent.create({
        data: {
          id: String(event.id),
          type: String(event.type),
          livemode: Boolean(event.livemode),
          stripeCreatedAt: event?.created ? new Date(Number(event.created) * 1000) : null,
          requestId,
          dataObjectId,
          dataObjectType,
          status: 'received',
        },
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;

      const existing = await prisma.stripeEvent.findUnique({
        where: { id: String(event.id) },
        select: { status: true },
      });
      if (existing?.status === 'processed') {
        return res.status(200).json({ received: true, duplicate: true, alreadyProcessed: true });
      }
      if (existing?.status === 'processing') {
        return res.status(200).json({ received: true, duplicate: true, processing: true });
      }
    }

    const lock = await prisma.stripeEvent.updateMany({
      where: { id: String(event.id), status: { in: ['received', 'failed'] } },
      data: { status: 'processing' },
    });
    if (lock.count !== 1) {
      return res.status(200).json({ received: true, skipped: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          if (session.mode === 'subscription') {
            await handleSubscriptionCreated({ requestId, session });
          }
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          await handleSubscriptionUpdated({ requestId, subscription });
          break;
        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          await handleInvoicePaid({ requestId, invoice });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await handleInvoicePaymentFailed({ requestId, invoice });
          break;
        }
        default:
          log({ level: 'info', msg: 'stripe_webhook_unhandled_event', requestId, eventType: event.type });
      }

      await prisma.stripeEvent.update({
        where: { id: String(event.id) },
        data: { status: 'processed', processedAt: new Date() },
      });
      res.status(200).json({ received: true });
    } catch (error) {
      try {
        await prisma.stripeEvent.update({
          where: { id: String(event.id) },
          data: {
            status: 'failed',
            processedAt: new Date(),
            error: String(error?.message || 'Webhook handler failed').slice(0, 2000),
          },
        });
      } catch { }
      log({ level: 'error', msg: 'stripe_webhook_handler_failed', requestId, eventType: event?.type, error });
      reportError(error, { route: '/api/webhooks/stripe', requestId, eventType: event?.type });
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

const resolveSubscriptionTypeFromStripe = async (stripe, subscription) => {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  const price = await stripe.prices.retrieve(priceId);
  const product = await stripe.products.retrieve(price.product);
  return product?.metadata?.type?.toUpperCase() || 'STANDARD';
};

const shouldDowngradeFromStripeStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return ['canceled', 'unpaid', 'incomplete_expired'].includes(normalized);
};

async function handleSubscriptionCreated({ requestId, session }) {
  const customerId = session.customer;
  const metadata = session.metadata;

  if (metadata?.type) {
    const type = metadata.type.toUpperCase();
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: {
        subscriptionType: type,
        providerSubscriptionId: session?.subscription ? String(session.subscription) : null,
        pendingSubscriptionType: null,
        pendingEffectiveAt: null,
        pendingStripePriceId: null,
      },
    });
    log({ level: 'info', msg: 'stripe_subscription_created', requestId, customerId, subscriptionType: type });
  }
}

async function handleSubscriptionUpdated({ requestId, subscription }) {
  const customerId = subscription.customer;
  const status = subscription.status;
  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(Number(subscription.current_period_end) * 1000)
    : null;

  if (shouldDowngradeFromStripeStatus(status)) {
    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: {
        subscriptionType: 'FREE',
        providerSubscriptionId: subscription?.id ? String(subscription.id) : null,
        currentPeriodEnd,
        pendingSubscriptionType: null,
        pendingEffectiveAt: null,
        pendingStripePriceId: null,
      },
    });
    log({ level: 'info', msg: 'stripe_subscription_downgraded', requestId, customerId, subscriptionType: 'FREE', status });
  } else if (status === 'active' || status === 'trialing') {
    const stripe = await getStripe();
    const type = await resolveSubscriptionTypeFromStripe(stripe, subscription);
    if (!type) return;

    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId },
      data: {
        subscriptionType: type,
        providerSubscriptionId: subscription?.id ? String(subscription.id) : null,
        currentPeriodEnd,
      },
    });

    await prisma.customerPayment.updateMany({
      where: { paymentId: customerId, pendingSubscriptionType: type },
      data: { pendingSubscriptionType: null, pendingEffectiveAt: null, pendingStripePriceId: null },
    });

    log({ level: 'info', msg: 'stripe_subscription_updated', requestId, customerId, subscriptionType: type, status });
  }
}

async function handleInvoicePaid({ requestId, invoice }) {
  const customerId = invoice?.customer || null;
  const subscriptionId = invoice?.subscription || null;
  if (!customerId || !subscriptionId) return;

  const stripe = await getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated({ requestId, subscription });

  await maybeCreateAndSendNFSe({ requestId, invoice });
}

async function handleInvoicePaymentFailed({ requestId, invoice }) {
  const customerId = invoice?.customer || null;
  if (!customerId) return;

  const attemptCount = Number(invoice?.attempt_count || 0);
  if (attemptCount < 3) {
    log({ level: 'info', msg: 'stripe_invoice_payment_failed_grace', requestId, customerId, attemptCount });
    return;
  }

  await prisma.customerPayment.updateMany({
    where: { paymentId: customerId },
    data: {
      subscriptionType: 'FREE',
      providerSubscriptionId: null,
      currentPeriodEnd: null,
      pendingSubscriptionType: null,
      pendingEffectiveAt: null,
      pendingStripePriceId: null,
    },
  });

  log({ level: 'info', msg: 'stripe_invoice_payment_failed_downgrade', requestId, customerId, attemptCount });
}

const getFocusBaseUrl = (environment) => {
  const env = String(environment || '').trim().toLowerCase();
  if (env === 'producao' || env === 'produção' || env === 'production') return 'https://api.focusnfe.com.br';
  return 'https://homologacao.focusnfe.com.br';
};

const buildBasicAuthHeader = (token) => {
  const raw = `${token}:`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
};

async function maybeCreateAndSendNFSe({ requestId, invoice }) {
  const nfseEnabled = await getSystemConfig('NFSE_ENABLED', process.env.NFSE_ENABLED);
  const enabled = String(nfseEnabled || '').trim().toLowerCase() === 'true';
  if (!enabled) return;

  const stripeInvoiceId = invoice?.id ? String(invoice.id) : null;
  const stripeCustomerId = invoice?.customer ? String(invoice.customer) : null;
  if (!stripeInvoiceId || !stripeCustomerId) return;

  const existing = await prisma.fiscalDocument.findFirst({
    where: { stripeInvoiceId },
    select: { id: true, status: true },
  });
  if (existing) return;

  const customerPayment = await prisma.customerPayment.findFirst({
    where: { paymentId: stripeCustomerId },
    include: {
      customer: {
        include: {
          fiscalProfile: {
            include: { issuer: true },
          },
        },
      },
    },
  });
  const user = customerPayment?.customer || null;
  const fiscalProfile = user?.fiscalProfile || null;
  const issuers = await upsertFiscalIssuersFromConfig();
  const issuer =
    fiscalProfile?.issuer ||
    issuers.find((i) => i.isDefault) ||
    issuers[0] ||
    (await prisma.fiscalIssuer.findFirst({ where: { isDefault: true }, orderBy: { updatedAt: 'desc' } })) ||
    null;

  if (!fiscalProfile || !issuer) {
    await prisma.fiscalDocument.create({
      data: {
        reference: `NFSE${stripeInvoiceId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 60),
        stripeInvoiceId,
        stripeCustomerId,
        userId: user?.id || null,
        fiscalProfileId: fiscalProfile?.id || null,
        issuerId: issuer?.id || null,
        status: 'skipped',
        error: !issuer
          ? 'Missing fiscal issuer configuration'
          : 'Missing fiscal profile for customer',
      },
    });
    return;
  }

  const focusApiKey =
    (await getSystemConfig('FOCUS_NFE_API_KEY', process.env.FOCUS_NFE_API_KEY)) ||
    (await getSystemConfig('FOCUSNFE_TOKEN', process.env.FOCUSNFE_TOKEN));
  if (!focusApiKey) {
    await prisma.fiscalDocument.create({
      data: {
        reference: `NFSE${stripeInvoiceId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 60),
        stripeInvoiceId,
        stripeCustomerId,
        userId: user?.id || null,
        fiscalProfileId: fiscalProfile.id,
        issuerId: issuer.id,
        status: 'error',
        error: 'Missing Focus NFe API key',
      },
    });
    return;
  }

  const focusEnv =
    (await getSystemConfig('FOCUS_NFE_ENVIRONMENT', process.env.FOCUS_NFE_ENVIRONMENT)) ||
    (await getSystemConfig('FOCUSNFE_ENVIRONMENT', process.env.FOCUSNFE_ENVIRONMENT));
  const baseUrl = getFocusBaseUrl(focusEnv);
  const nfseEndpoint =
    (await getSystemConfig('FOCUS_NFE_NFSE_ENDPOINT', process.env.FOCUS_NFE_NFSE_ENDPOINT)) ||
    (await getSystemConfig('FOCUSNFE_NFSE_ENDPOINT', process.env.FOCUSNFE_NFSE_ENDPOINT));
  const endpoint = String(nfseEndpoint || 'nfsen').trim().toLowerCase() === 'nfse' ? 'nfse' : 'nfsen';

  const now = new Date();
  const dataEmissao = now.toISOString();
  const dataCompetencia = dataEmissao.slice(0, 10);

  const codigoTributacaoNacionalIss = await getSystemConfig(
    'NFSE_CODIGO_TRIBUTACAO_NACIONAL_ISS',
    process.env.NFSE_CODIGO_TRIBUTACAO_NACIONAL_ISS
  );
  const codigoNbs = await getSystemConfig('NFSE_CODIGO_NBS', process.env.NFSE_CODIGO_NBS);

  const requiredConfigOk = Boolean(codigoTributacaoNacionalIss) && Boolean(codigoNbs);
  if (!requiredConfigOk) {
    await prisma.fiscalDocument.create({
      data: {
        reference: `NFSE${stripeInvoiceId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 60),
        stripeInvoiceId,
        stripeCustomerId,
        userId: user?.id || null,
        fiscalProfileId: fiscalProfile.id,
        issuerId: issuer.id,
        status: 'error',
        error: 'Missing NFSe tax configuration (codigo_tributacao_nacional_iss / codigo_nbs)',
      },
    });
    return;
  }

  const documentDigits = String(fiscalProfile.document || '').replace(/\D/g, '');
  const isCnpj = String(fiscalProfile.documentType || '').trim().toUpperCase() === 'CNPJ';
  const amount = typeof invoice?.amount_paid === 'number' ? invoice.amount_paid / 100 : null;
  const currency = invoice?.currency ? String(invoice.currency).toUpperCase() : null;

  const missingRequirements = [];
  if (!documentDigits) missingRequirements.push('tomador_document');
  if (!fiscalProfile.codigoMunicipio) missingRequirements.push('tomador_codigo_municipio');
  if (!fiscalProfile.name) missingRequirements.push('tomador_nome');
  if (!issuer?.cnpjPrestador) missingRequirements.push('prestador_cnpj');
  if (!issuer?.codigoMunicipioEmissora) missingRequirements.push('prestador_codigo_municipio_emissora');
  if (amount === null) missingRequirements.push('valor_servico');
  if (missingRequirements.length > 0) {
    await prisma.fiscalDocument.create({
      data: {
        reference: `NFSE${stripeInvoiceId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 60),
        stripeInvoiceId,
        stripeCustomerId,
        userId: user?.id || null,
        fiscalProfileId: fiscalProfile.id,
        issuerId: issuer.id,
        status: 'error',
        error: `Missing NFSe required fields: ${missingRequirements.join(', ')}`.slice(0, 2000),
      },
    });
    return;
  }

  const description =
    (Array.isArray(invoice?.lines?.data) && invoice.lines.data[0]?.description ? String(invoice.lines.data[0].description) : null) ||
    (invoice?.description ? String(invoice.description) : null) ||
    `Assinatura (${stripeInvoiceId})`;

  const payload = {
    data_emissao: dataEmissao,
    data_competencia: dataCompetencia,
    codigo_municipio_emissora: issuer.codigoMunicipioEmissora,
    cnpj_prestador: String(issuer.cnpjPrestador || '').replace(/\D/g, ''),
    inscricao_municipal_prestador: issuer.inscricaoMunicipalPrestador || undefined,
    codigo_opcao_simples_nacional: issuer.codigoOpcaoSimplesNacional ?? undefined,
    regime_especial_tributacao: issuer.regimeEspecialTributacao ?? undefined,
    ...(isCnpj ? { cnpj_tomador: documentDigits } : { cpf_tomador: documentDigits }),
    razao_social_tomador: fiscalProfile.name,
    codigo_municipio_tomador: fiscalProfile.codigoMunicipio,
    cep_tomador: fiscalProfile.cep || undefined,
    logradouro_tomador: fiscalProfile.logradouro || undefined,
    numero_tomador: fiscalProfile.numero || undefined,
    complemento_tomador: fiscalProfile.complemento || undefined,
    bairro_tomador: fiscalProfile.bairro || undefined,
    telefone_tomador: fiscalProfile.phone || undefined,
    email_tomador: fiscalProfile.email || undefined,
    codigo_municipio_prestacao: issuer.codigoMunicipioPrestacao || issuer.codigoMunicipioEmissora,
    codigo_tributacao_nacional_iss: String(codigoTributacaoNacionalIss),
    descricao_servico: description,
    valor_servico: amount,
    tributacao_iss: 1,
    tipo_retencao_iss: 1,
    codigo_nbs: String(codigoNbs),
    indicador_total_tributacao: '0',
  };

  const reference = `NFSE${stripeInvoiceId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 60);
  const doc = await prisma.fiscalDocument.create({
    data: {
      reference,
      stripeInvoiceId,
      stripeCustomerId,
      userId: user?.id || null,
      fiscalProfileId: fiscalProfile.id,
      issuerId: issuer.id,
      amount: amount !== null ? amount : null,
      currency,
      status: 'pending',
    },
  });

  try {
    const url = `${baseUrl}/v2/${endpoint}?ref=${encodeURIComponent(reference)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: buildBasicAuthHeader(String(focusApiKey)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let resultJson = null;
    try {
      resultJson = JSON.parse(resultText);
    } catch { }

    if (!response.ok) {
      const msg = resultJson?.mensagem || resultJson?.message || resultText || `Focus request failed (${response.status})`;
      await prisma.fiscalDocument.update({
        where: { id: doc.id },
        data: { status: 'error', error: String(msg).slice(0, 2000), providerStatus: String(response.status) },
      });
      log({ level: 'warn', msg: 'nfse_focus_submit_failed', requestId, stripeInvoiceId, status: response.status });
      return;
    }

    await prisma.fiscalDocument.update({
      where: { id: doc.id },
      data: {
        status: 'submitted',
        providerStatus: resultJson?.status ? String(resultJson.status) : String(response.status),
      },
    });
  } catch (error) {
    await prisma.fiscalDocument.update({
      where: { id: doc.id },
      data: { status: 'error', error: String(error?.message || 'NFSe submit failed').slice(0, 2000) },
    });
    throw error;
  }
}

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

async function upsertFiscalIssuersFromConfig() {
  const json = await getSystemConfig('NFSE_ISSUERS_JSON', process.env.NFSE_ISSUERS_JSON);
  const parsed = safeParseJson(json);
  const list = Array.isArray(parsed) ? parsed : null;

  let issuerInputs = list;
  if (!issuerInputs) {
    const existingIssuers = await prisma.fiscalIssuer.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (existingIssuers.length > 0) return existingIssuers;

    const code = await getSystemConfig('NFSE_ISSUER_CODE', process.env.NFSE_ISSUER_CODE);
    const name = await getSystemConfig('NFSE_ISSUER_NAME', process.env.NFSE_ISSUER_NAME);
    const cnpjPrestador = await getSystemConfig('NFSE_ISSUER_CNPJ', process.env.NFSE_ISSUER_CNPJ);
    const inscricaoMunicipalPrestador = await getSystemConfig(
      'NFSE_ISSUER_IM',
      process.env.NFSE_ISSUER_IM
    );
    const codigoMunicipioEmissora = await getSystemConfig(
      'NFSE_ISSUER_CODIGO_MUNICIPIO_EMISSORA',
      process.env.NFSE_ISSUER_CODIGO_MUNICIPIO_EMISSORA
    );
    const codigoMunicipioPrestacao = await getSystemConfig(
      'NFSE_ISSUER_CODIGO_MUNICIPIO_PRESTACAO',
      process.env.NFSE_ISSUER_CODIGO_MUNICIPIO_PRESTACAO
    );
    const codigoOpcaoSimplesNacional = await getSystemConfig(
      'NFSE_ISSUER_OPCAO_SIMPLES_NACIONAL',
      process.env.NFSE_ISSUER_OPCAO_SIMPLES_NACIONAL
    );
    const regimeEspecialTributacao = await getSystemConfig(
      'NFSE_ISSUER_REGIME_ESPECIAL_TRIBUTACAO',
      process.env.NFSE_ISSUER_REGIME_ESPECIAL_TRIBUTACAO
    );
    const isDefault = await getSystemConfig('NFSE_ISSUER_IS_DEFAULT', process.env.NFSE_ISSUER_IS_DEFAULT);

    issuerInputs = [
      {
        code: String(code || 'default').trim() || 'default',
        name: String(name || '').trim() || 'Emitente',
        cnpjPrestador: String(cnpjPrestador || '').replace(/\D/g, ''),
        inscricaoMunicipalPrestador: inscricaoMunicipalPrestador ? String(inscricaoMunicipalPrestador) : null,
        codigoMunicipioEmissora: codigoMunicipioEmissora ? Number(codigoMunicipioEmissora) : null,
        codigoMunicipioPrestacao: codigoMunicipioPrestacao ? Number(codigoMunicipioPrestacao) : null,
        codigoOpcaoSimplesNacional: codigoOpcaoSimplesNacional ? Number(codigoOpcaoSimplesNacional) : null,
        regimeEspecialTributacao: regimeEspecialTributacao ? Number(regimeEspecialTributacao) : null,
        isDefault: String(isDefault || '').trim().toLowerCase() === 'true',
      },
    ];
  }

  const normalizedInputs = issuerInputs
    .map((i) => ({
      code: String(i?.code || '').trim(),
      name: String(i?.name || '').trim(),
      cnpjPrestador: String(i?.cnpjPrestador || '').replace(/\D/g, ''),
      inscricaoMunicipalPrestador: i?.inscricaoMunicipalPrestador ? String(i.inscricaoMunicipalPrestador) : null,
      codigoMunicipioEmissora: i?.codigoMunicipioEmissora ? Number(i.codigoMunicipioEmissora) : null,
      codigoMunicipioPrestacao: i?.codigoMunicipioPrestacao ? Number(i.codigoMunicipioPrestacao) : null,
      codigoOpcaoSimplesNacional: i?.codigoOpcaoSimplesNacional !== undefined && i?.codigoOpcaoSimplesNacional !== null
        ? Number(i.codigoOpcaoSimplesNacional)
        : null,
      regimeEspecialTributacao: i?.regimeEspecialTributacao !== undefined && i?.regimeEspecialTributacao !== null
        ? Number(i.regimeEspecialTributacao)
        : null,
      isDefault: Boolean(i?.isDefault),
    }))
    .filter((i) => i.code && i.cnpjPrestador && i.codigoMunicipioEmissora);

  if (normalizedInputs.length === 0) return [];

  if (normalizedInputs.some((i) => i.isDefault)) {
    await prisma.fiscalIssuer.updateMany({ data: { isDefault: false } });
  }

  const upserted = [];
  for (const input of normalizedInputs) {
    const saved = await prisma.fiscalIssuer.upsert({
      where: { code: input.code },
      update: {
        name: input.name,
        cnpjPrestador: input.cnpjPrestador,
        inscricaoMunicipalPrestador: input.inscricaoMunicipalPrestador,
        codigoMunicipioEmissora: input.codigoMunicipioEmissora,
        codigoMunicipioPrestacao: input.codigoMunicipioPrestacao,
        codigoOpcaoSimplesNacional: input.codigoOpcaoSimplesNacional,
        regimeEspecialTributacao: input.regimeEspecialTributacao,
        isDefault: input.isDefault,
      },
      create: {
        code: input.code,
        name: input.name,
        cnpjPrestador: input.cnpjPrestador,
        inscricaoMunicipalPrestador: input.inscricaoMunicipalPrestador,
        codigoMunicipioEmissora: input.codigoMunicipioEmissora,
        codigoMunicipioPrestacao: input.codigoMunicipioPrestacao,
        codigoOpcaoSimplesNacional: input.codigoOpcaoSimplesNacional,
        regimeEspecialTributacao: input.regimeEspecialTributacao,
        isDefault: input.isDefault,
      },
    });
    upserted.push(saved);
  }

  return upserted;
}

export default handler;
