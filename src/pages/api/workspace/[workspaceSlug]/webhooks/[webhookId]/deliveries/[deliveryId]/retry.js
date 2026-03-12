import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import crypto from 'crypto';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, webhookId, deliveryId } = req.query;
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

  if (method === 'POST') {
    try {
      const dbDelivery = await prisma.webhookDelivery.findFirst({
        where: { id: deliveryId, webhookId, webhook: { workspaceId: workspace.id } },
        include: { webhook: true }
      });

      if (!dbDelivery) {
        return res.status(404).json({ error: { msg: 'Delivery or Webhook not found' } });
      }

      const { webhook, payload } = dbDelivery;

      if (!webhook.isActive) {
        return res.status(400).json({ error: { msg: 'Webhook is inactive' } });
      }

      // We modify the payload slightly to reflect this is a retry and update the timestamp
      const retryPayload = {
        ...payload,
        occurredAt: new Date().toISOString(),
        isRetry: true,
        originalDeliveryId: dbDelivery.id,
      };

      const rawBody = JSON.stringify(retryPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const newDelivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          payload: retryPayload,
          status: 'PENDING',
          attempts: dbDelivery.attempts + 1,
        }
      });

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-nextacular-event': payload.event,
            'x-nextacular-timestamp': timestamp,
            'x-nextacular-signature': `sha256=${signature}`,
          },
          body: rawBody,
          signal: controller.signal,
        });

        const responseBody = await response.text();
        const isSuccess = response.ok;

        await prisma.webhookDelivery.update({
          where: { id: newDelivery.id },
          data: {
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            responseCode: response.status,
            responseBody: responseBody.substring(0, 500),
          }
        });

        res.status(200).json({ data: { msg: 'Retry completed', status: isSuccess ? 'SUCCESS' : 'FAILED' } });
      } catch (error) {
        await prisma.webhookDelivery.update({
          where: { id: newDelivery.id },
          data: {
            status: 'FAILED',
            responseCode: 0,
            responseBody: error.message || 'Unknown Error',
          }
        });
        res.status(200).json({ data: { msg: 'Retry failed', status: 'FAILED' } });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      res.status(500).json({ error: { msg: 'Unable to retry webhook delivery' } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
