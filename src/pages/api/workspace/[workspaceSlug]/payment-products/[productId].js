import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { ensureRequestId } from '@/lib/server/request-id';

export default async function handler(req, res) {
  const requestId = ensureRequestId(req, res);
  const { method } = req;
  const { workspaceSlug, productId } = req.query;

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

  const product = await prisma.paymentProduct.findFirst({
    where: { id: String(productId), workspaceId: workspace.id, deletedAt: null },
  });
  if (!product) {
    return res.status(404).json({ error: { msg: 'Product not found' } });
  }

  if (method === 'GET') {
    return res.status(200).json({ data: { product } });
  }

  if (method === 'PUT') {
    const rl = await rateLimit({ req, limit: 240, windowMs: 60_000, key: `w:${workspace.id}:payment-products:put:1m` });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      const { name, description, currency, price, active } = req.body || {};

      const data = {};
      if (name != null) {
        const parsedName = `${name || ''}`.trim();
        if (!parsedName) return res.status(400).json({ error: { msg: 'Invalid name' } });
        data.name = parsedName;
      }
      if (description !== undefined) {
        data.description = description ? String(description) : null;
      }
      if (currency != null) {
        const parsedCurrency = String(currency || '').trim().toUpperCase();
        if (!parsedCurrency) return res.status(400).json({ error: { msg: 'Invalid currency' } });
        data.currency = parsedCurrency;
      }
      if (price != null) {
        const parsedPrice = Number(price);
        if (!parsedPrice || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
          return res.status(400).json({ error: { msg: 'Invalid price' } });
        }
        data.price = parsedPrice;
      }
      if (active != null) {
        data.active = Boolean(active);
      }

      const updated = await prisma.paymentProduct.update({
        where: { id: product.id },
        data,
      });

      return res.status(200).json({ data: { product: updated } });
    } catch (error) {
      log({ level: 'error', msg: 'payment_products_update_failed', requestId, workspaceId: workspace.id, productId: product.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payment-products/[productId]', requestId, workspaceId: workspace.id, productId: product.id });
      return res.status(500).json({ error: { msg: 'Unable to update product' } });
    }
  }

  if (method === 'DELETE') {
    const rl = await rateLimit({ req, limit: 240, windowMs: 60_000, key: `w:${workspace.id}:payment-products:delete:1m` });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      await prisma.paymentProduct.update({
        where: { id: product.id },
        data: { deletedAt: new Date(), active: false },
      });
      return res.status(200).json({ data: { deleted: true } });
    } catch (error) {
      log({ level: 'error', msg: 'payment_products_delete_failed', requestId, workspaceId: workspace.id, productId: product.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payment-products/[productId]', requestId, workspaceId: workspace.id, productId: product.id });
      return res.status(500).json({ error: { msg: 'Unable to delete product' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
}

