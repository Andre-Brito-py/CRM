import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { createCustomer, createPayment, findCustomerByExternalReference } from '@/lib/server/asaas';
import { processAutomation } from '@/prisma/services/automation';
import { sendWhatsAppMessage } from '@/lib/server/whatsapp';
import { createConversation, createMessage } from '@/prisma/services/conversation';
import { renderTemplateString } from '@/prisma/services/template';
import { getSystemConfig } from '@/lib/server/config';

const mapAsaasStatusToLocal = (asaasStatus) => {
  const status = String(asaasStatus || '').toUpperCase();
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return 'PAID';
  if (['CANCELLED', 'DELETED'].includes(status)) return 'CANCELED';
  if (['OVERDUE', 'REFUNDED', 'CHARGEBACK'].includes(status)) return 'FAILED';
  return 'PENDING';
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;

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
      console.error('payments list error:', error);
      return res.status(500).json({ error: { msg: 'Unable to fetch payments' } });
    }
  }

  if (method === 'POST') {
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

      const localPayment = await prisma.payment.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          dealId: deal?.id || (dealId || null),
          value: parsedValue,
          description: description || null,
          billingType,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'PENDING',
          externalReference: null,
        },
      });

      const customerExternalReference = `workspace:${workspace.id}:contact:${contact.id}`;
      let asaasCustomerId = contact.asaasCustomerId;

      if (!asaasCustomerId) {
        const existing = await findCustomerByExternalReference(customerExternalReference);
        if (existing?.id) {
          asaasCustomerId = existing.id;
        } else {
          const createdCustomer = await createCustomer({
            name: contact.name,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            mobilePhone: contact.phone || undefined,
            externalReference: customerExternalReference,
          });
          asaasCustomerId = createdCustomer?.id;
        }

        if (asaasCustomerId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { asaasCustomerId },
          });
        }
      }

      if (!asaasCustomerId) {
        return res.status(500).json({ error: { msg: 'Failed to create or resolve Asaas customer' } });
      }

      const callbackSuccessUrl = await getSystemConfig('ASAAS_PAYMENT_SUCCESS_URL', process.env.ASAAS_PAYMENT_SUCCESS_URL);
      const callback =
        callbackSuccessUrl
          ? { successUrl: callbackSuccessUrl, autoRedirect: false }
          : undefined;

      const asaasPayment = await createPayment({
        customer: asaasCustomerId,
        billingType,
        value: parsedValue,
        dueDate: dueDate ? String(dueDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        description,
        externalReference: localPayment.id,
        callback,
      });

      const updated = await prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          asaasCustomerId,
          asaasPaymentId: asaasPayment?.id || null,
          invoiceUrl: asaasPayment?.invoiceUrl || null,
          paymentUrl: asaasPayment?.invoiceUrl || null,
          externalReference: asaasPayment?.externalReference || localPayment.id,
          status: mapAsaasStatusToLocal(asaasPayment?.status),
          dueDate: asaasPayment?.dueDate ? new Date(asaasPayment.dueDate) : localPayment.dueDate,
        },
      });

      processAutomation(workspace.id, 'PAYMENT_CREATED', {
        paymentId: updated.id,
        payment: updated,
        contactId: contact.id,
        dealId: deal?.id || null,
      }).catch((err) => console.error('processAutomation PAYMENT_CREATED failed:', err));

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
                'ASAAS_WHATSAPP_MESSAGE_TEMPLATE',
                process.env.ASAAS_WHATSAPP_MESSAGE_TEMPLATE || 'Olá {{contact.firstName}}, segue o link para pagamento: {{payment.invoiceUrl}}'
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
      console.error('payments create error:', error);
      const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
      return res.status(status).json({ error: { msg: error.message || 'Unable to create payment' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
};

export default handler;
