import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const providerId = req.query?.providerId;
  if (!providerId) {
    res.status(400).json({ error: { msg: 'providerId is required' } });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ error: { msg: 'Method not supported' } });
    return;
  }

  try {
    const { status, displayName } = req.body || {};
    const data = {};
    if (status === 'active' || status === 'disabled') data.status = status;
    if (typeof displayName === 'string' && displayName.trim()) data.displayName = displayName.trim();

    const provider = await prisma.paymentProvider.update({
      where: { id: String(providerId) },
      data,
      select: { id: true, name: true, displayName: true, status: true, updatedAt: true },
    });

    res.status(200).json({ data: { provider } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { msg: 'Failed to update provider' } });
  }
}

