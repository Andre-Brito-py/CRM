import prisma from '@/prisma/index';
import { rateLimit } from '@/lib/server/rateLimit';
import { ensureRequestId } from '@/lib/server/request-id';
import { log, reportError } from '@/lib/server/logger';
import { getSystemConfig } from '@/lib/server/config';
import { calculateFees, getPlatformFeeSettings, getProvider } from '@/lib/server/payment-providers/resolver';
import { processAutomation } from '@/prisma/services/automation';

const buildPublicUrl = (req, path) => {
  const proto = `${req.headers['x-forwarded-proto'] || 'https'}`.split(',')[0].trim();
  const host = `${req.headers['x-forwarded-host'] || req.headers.host}`.split(',')[0].trim();
  return `${proto}://${host}${path}`;
};

const normalizePhone = (value) => {
  const s = `${value || ''}`.trim();
  if (!s) return null;
  return s.startsWith('+') ? s : s;
};

const normalizeBillingType = (value) => {
  const t = String(value || '').trim().toUpperCase();
  if (t === 'BOLETO' || t === 'CREDIT_CARD' || t === 'PIX') return t;
  return 'PIX';
};

export default async function handler(req, res) {
  const requestId = ensureRequestId(req, res);
  const { method } = req;
  const { workspaceSlug, productSlug } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }

  const rl = await rateLimit({ req, limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: String(workspaceSlug) },
      select: { id: true, slug: true, name: true },
    });
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    const product = await prisma.paymentProduct.findFirst({
      where: {
        workspaceId: workspace.id,
        slug: String(productSlug),
        deletedAt: null,
        active: true,
      },
    });
    if (!product) {
      return res.status(404).json({ error: { msg: 'Product not found' } });
    }

    const { name, email, phone, billingType } = req.body || {};
    const payerName = `${name || ''}`.trim();
    if (!payerName) {
      return res.status(400).json({ error: { msg: 'name is required' } });
    }

    const payerEmail = email ? String(email).trim() : null;
    const payerPhone = normalizePhone(phone);

    let contact = null;
    if (payerPhone || payerEmail) {
      contact = await prisma.contact.findFirst({
        where: {
          workspaceId: workspace.id,
          OR: [
            payerPhone ? { phone: payerPhone } : undefined,
            payerPhone ? { phone: `+${payerPhone.replace(/^\+/, '')}` } : undefined,
            payerEmail ? { email: payerEmail } : undefined,
          ].filter(Boolean),
        },
      });
    }

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: payerName,
          email: payerEmail || null,
          phone: payerPhone || null,
        },
      });
    }

    const { percentage, fixed } = await getPlatformFeeSettings(workspace.id);
    const amount = Number(product.price || 0);
    const { platformFee, netAmount } = calculateFees({ amount, percentage, fixed });

    const localPayment = await prisma.payment.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact?.id || null,
        dealId: null,
        amount,
        value: amount,
        platformFee,
        netAmount,
        description: product.name || null,
        billingType: normalizeBillingType(billingType),
        dueDate: new Date(),
        status: 'PENDING',
        externalReference: null,
      },
    });

    const provider = await getProvider(workspace.id);
    const providerName = String(provider?.provider?.name || '').toLowerCase();
    const paymentSetting = await prisma.workspacePaymentSetting.findUnique({
      where: { workspaceId: workspace.id },
      select: { providerAccountId: true },
    });
    const providerAccountId = paymentSetting?.providerAccountId || null;

    let providerCustomerId = null;
    if (providerName === 'asaas') {
      providerCustomerId = contact.asaasCustomerId || null;
      if (!providerCustomerId) {
        const customerExternalReference = `workspace:${workspace.id}:contact:${contact.id}`;
        const createdCustomer = await provider.createCustomer({
          name: contact.name,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          externalReference: customerExternalReference,
        });
        providerCustomerId = createdCustomer?.id || null;
        if (providerCustomerId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { asaasCustomerId: providerCustomerId },
          });
        }
      }
    }

    const configuredAppUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
    const pagePath = `/p/${workspace.slug}/${product.slug}`;
    const appUrl = configuredAppUrl || buildPublicUrl(req, '');
    const pageUrl = `${appUrl}${pagePath}`;

    const paymentResult = await provider.createPayment({
      customerId: providerCustomerId,
      billingType: normalizeBillingType(billingType),
      amount,
      currency: product.currency || 'BRL',
      dueDate: new Date().toISOString().slice(0, 10),
      description: product.name,
      externalReference: localPayment.id,
      successUrl: `${pageUrl}?status=success`,
      cancelUrl: `${pageUrl}?status=cancelled`,
      recipientAccountId: providerAccountId,
      splitFixedValue: netAmount,
      platformFee,
      metadata: {
        workspaceId: workspace.id,
        contactId: contact.id,
        paymentId: localPayment.id,
        paymentProductId: product.id,
      },
    });

    const paymentLink = paymentResult?.paymentLink || null;
    const updated = await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        providerId: provider?.provider?.id || null,
        providerPaymentId: paymentResult?.providerPaymentId || null,
        paymentLink,
        status: paymentResult?.status || 'PENDING',
        dueDate: localPayment.dueDate,
        externalReference: localPayment.id,
        asaasCustomerId: providerName === 'asaas' ? providerCustomerId : null,
        asaasPaymentId: providerName === 'asaas' ? (paymentResult?.providerPaymentId || null) : null,
        invoiceUrl: providerName === 'asaas' ? paymentLink : null,
        paymentUrl: providerName === 'asaas' ? paymentLink : null,
      },
    });

    processAutomation(workspace.id, 'PAYMENT_CREATED', {
      paymentId: updated.id,
      payment: updated,
      contactId: contact.id,
      dealId: null,
    }).catch((err) => {
      log({ level: 'error', msg: 'automation_payment_created_failed', requestId, workspaceId: workspace.id, paymentId: updated.id, error: err });
      reportError(err, { route: 'automation:PAYMENT_CREATED', requestId, workspaceId: workspace.id, paymentId: updated.id });
    });

    return res.status(200).json({
      data: {
        paymentId: updated.id,
        paymentLink,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'public_product_checkout_failed', requestId, workspaceSlug, productSlug, error });
    reportError(error, { route: '/api/public/payment-products/[workspaceSlug]/[productSlug]/checkout', requestId });
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    return res.status(status).json({ error: { msg: error.message || 'Unable to create payment' } });
  }
}
