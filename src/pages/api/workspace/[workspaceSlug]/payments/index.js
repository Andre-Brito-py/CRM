import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { processAutomation } from '@/prisma/services/automation';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { createConversation, createMessage } from '@/prisma/services/conversation';
import { renderTemplateString } from '@/prisma/services/template';
import { getSystemConfig } from '@/lib/server/config';
import { calculateFees, getPlatformFeeSettings, getProvider } from '@/lib/server/payment-providers/resolver';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { createAuditActivity } from '@/prisma/services/activity';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

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

  if (method === 'GET') {
    try {
      const { contactId, dealId, status } = req.query;
      const where = { workspaceId: workspace.id, deletedAt: null };
      if (contactId) where.contactId = String(contactId);
      if (dealId) where.dealId = String(dealId);
      if (status) where.status = String(status).toUpperCase();

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ data: { payments } });
    } catch (error) {
      log({ level: 'error', msg: 'payments_list_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payments', requestId, workspaceId: workspace.id });
      return res.status(500).json({ error: { msg: 'Unable to fetch payments' } });
    }
  }

  if (method === 'POST') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      const warnings = [];
      const {
        contactId,
        dealId,
        value,
        description,
        billingType = 'PIX',
        dueDate,
        sendWhatsApp = false,
        whatsAppMessage,
      } = req.body || {};

      if (!contactId && !dealId) {
        return res.status(400).json({ error: { msg: 'contactId or dealId is required' } });
      }

      const parsedValue = Number(value);
      if (!parsedValue || Number.isNaN(parsedValue) || parsedValue <= 0) {
        return res.status(400).json({ error: { msg: 'Invalid value' } });
      }

      const deal = dealId
        ? await prisma.deal.findFirst({
          where: { id: dealId, workspaceId: workspace.id, deletedAt: null },
          include: { contact: true },
        })
        : null;

      const resolvedContactId = contactId || deal?.contactId;
      if (!resolvedContactId) {
        return res.status(400).json({ error: { msg: 'Unable to resolve contactId for payment' } });
      }

      const contact = await prisma.contact.findFirst({
        where: { id: resolvedContactId, workspaceId: workspace.id, deletedAt: null },
      });
      if (!contact) {
        return res.status(404).json({ error: { msg: 'Contact not found' } });
      }

      const { percentage, fixed } = await getPlatformFeeSettings(workspace.id);
      const { platformFee, netAmount } = calculateFees({ amount: parsedValue, percentage, fixed });

      const localPayment = await prisma.payment.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          dealId: deal?.id || (dealId || null),
          amount: parsedValue,
          value: parsedValue,
          platformFee,
          netAmount,
          description: description || null,
          billingType,
          dueDate: dueDate ? new Date(dueDate) : null,
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
      if (providerName === 'asaas' && platformFee > 0 && !providerAccountId) {
        warnings.push('Monetização: defina Provider Account (walletId) para habilitar split no Asaas.');
      }
      if (providerName === 'mercadopago' && platformFee > 0 && !providerAccountId) {
        warnings.push('Monetização: defina Provider Account (collector_id) para habilitar taxa no Mercado Pago.');
      }
      if (providerName === 'pagarme' && platformFee > 0 && !providerAccountId) {
        warnings.push('Monetização: defina Provider Account (recipient_id) para habilitar split no Pagar.me.');
      }
      if (providerName === 'stripe' && platformFee > 0) {
        warnings.push('Monetização: Stripe sem split automático (necessário Stripe Connect para dividir valores).');
      }

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

      const appUrl = await getSystemConfig('APP_URL', process.env.APP_URL);
      const paymentResult = await provider.createPayment({
        customerId: providerCustomerId,
        billingType,
        amount: parsedValue,
        currency: 'BRL',
        dueDate: dueDate ? String(dueDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        description,
        externalReference: localPayment.id,
        successUrl: appUrl ? `${appUrl}/account/${workspaceSlug}/payments?status=success` : undefined,
        cancelUrl: appUrl ? `${appUrl}/account/${workspaceSlug}/payments?status=cancelled` : undefined,
        recipientAccountId: providerAccountId,
        splitFixedValue: netAmount,
        platformFee,
        metadata: {
          workspaceId: workspace.id,
          contactId: contact.id,
          dealId: deal?.id || null,
          paymentId: localPayment.id,
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

      await createAuditActivity(
        workspace.id,
        session.user.userId || session.user.id,
        {
          action: 'PAYMENT_CREATE',
          title: 'Payment created',
          target: { paymentId: updated.id, contactId: contact.id, dealId: deal?.id || null },
          metadata: {
            amount: parsedValue,
            billingType,
            status: updated.status,
            provider: providerName || null,
          },
        },
        req
      );

      processAutomation(workspace.id, 'PAYMENT_CREATED', {
        paymentId: updated.id,
        payment: updated,
        contactId: contact.id,
        dealId: deal?.id || null,
      }).catch((err) => {
        log({ level: 'error', msg: 'automation_payment_created_failed', requestId, workspaceId: workspace.id, paymentId: updated.id, error: err });
        reportError(err, { route: 'automation:PAYMENT_CREATED', requestId, workspaceId: workspace.id, paymentId: updated.id });
      });

      if (sendWhatsApp) {
        const phone = contact.phone;
        if (phone) {
          const defaultIntegration = await prisma.integration.findFirst({
            where: { workspaceId: workspace.id, provider: 'WHATSAPP', enabled: true },
            select: { id: true },
          });

          if (!defaultIntegration?.id) {
            warnings.push('No active WhatsApp integration found.');
          } else {
            const messageTemplate =
              whatsAppMessage ||
              (await getSystemConfig(
                'PAYMENT_WHATSAPP_MESSAGE_TEMPLATE',
                process.env.PAYMENT_WHATSAPP_MESSAGE_TEMPLATE ||
                'Olá {{contact.name}} 👋\n\nSegue o link para pagamento:\n\n{{payment.paymentLink}}\n\nQualquer dúvida estou à disposição.'
              ));

            const rendered = await renderTemplateString(workspace.id, messageTemplate, {
              contactId: contact.id,
              dealId: deal?.id || null,
              paymentId: updated.id,
              payment: updated,
            });

            if (rendered) {
              const wamid = await sendWhatsAppMessage(defaultIntegration.id, phone, rendered);
              let conversation = await prisma.conversation.findFirst({
                where: { workspaceId: workspace.id, contactId: contact.id, platform: 'WHATSAPP' },
              });
              if (!conversation) {
                conversation = await createConversation(workspace.id, {
                  contactId: contact.id,
                  platform: 'WHATSAPP',
                  externalId: phone,
                });
              }
              await createMessage(conversation.id, {
                direction: 'OUTBOUND',
                type: 'TEXT',
                content: rendered,
                status: 'SENT',
                externalId: wamid,
              });
            }
          }
        }
      }

      return res.status(201).json({ data: { payment: updated }, warnings: warnings.length ? warnings : undefined });
    } catch (error) {
      log({ level: 'error', msg: 'payments_create_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payments', requestId, workspaceId: workspace.id });
      const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
      return res.status(status).json({ error: { msg: error.message || 'Unable to create payment' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;
