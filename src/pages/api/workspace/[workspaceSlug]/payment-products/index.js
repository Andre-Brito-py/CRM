import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import slugify from 'slugify';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { ensureRequestId } from '@/lib/server/request-id';

const normalizeSlug = (value) => {
  const s = `${value || ''}`.trim();
  if (!s) return '';
  return slugify(s, { lower: true, strict: true });
};

const findAvailableSlug = async ({ workspaceId, baseSlug }) => {
  const base = normalizeSlug(baseSlug);
  if (!base) return '';

  let candidate = base;
  for (let i = 0; i < 50; i += 1) {
    const existing = await prisma.paymentProduct.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
};

export default async function handler(req, res) {
  const requestId = ensureRequestId(req, res);
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

  const isOwner = isWorkspaceOwner(session.user.email, workspace);
  if (!isOwner) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  if (method === 'GET') {
    try {
      const { active } = req.query;
      const where = { workspaceId: workspace.id, deletedAt: null };
      if (active === 'true') where.active = true;
      if (active === 'false') where.active = false;

      const products = await prisma.paymentProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ data: { products } });
    } catch (error) {
      log({ level: 'error', msg: 'payment_products_list_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payment-products', requestId, workspaceId: workspace.id });
      return res.status(500).json({ error: { msg: 'Unable to fetch products' } });
    }
  }

  if (method === 'POST') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000, key: `w:${workspace.id}:payment-products:post:1m` });
    if (!rl.ok) {
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      const {
        name,
        slug,
        description,
        currency = 'BRL',
        price,
        imageUrl,
        active = true,
      } = req.body || {};

      const parsedName = `${name || ''}`.trim();
      if (!parsedName) {
        return res.status(400).json({ error: { msg: 'name is required' } });
      }

      const parsedPrice = Number(price);
      if (!parsedPrice || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: { msg: 'Invalid price' } });
      }

      const baseSlug = normalizeSlug(slug) || normalizeSlug(parsedName);
      if (!baseSlug) {
        return res.status(400).json({ error: { msg: 'Invalid slug' } });
      }

      const availableSlug = await findAvailableSlug({ workspaceId: workspace.id, baseSlug });

      const product = await prisma.paymentProduct.create({
        data: {
          workspaceId: workspace.id,
          name: parsedName,
          slug: availableSlug,
          description: description ? String(description) : null,
          currency: String(currency || 'BRL').toUpperCase(),
          price: parsedPrice,
          imageUrl: imageUrl ? String(imageUrl) : null,
          active: Boolean(active),
        },
      });

      return res.status(201).json({ data: { product } });
    } catch (error) {
      log({ level: 'error', msg: 'payment_products_create_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/payment-products', requestId, workspaceId: workspace.id });
      return res.status(500).json({ error: { msg: 'Unable to create product' } });
    }
  }

  return res.status(405).json({ error: { msg: `${method} method unsupported` } });
}
