import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

const upsertConfig = async ({ key, value, category }) => {
  return await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value), category },
    create: { key, value: String(value), category },
  });
};

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: ['PLATFORM_FEE_PERCENTAGE', 'PLATFORM_FEE_FIXED'] } },
      select: { key: true, value: true },
    });
    const map = new Map(configs.map((c) => [c.key, c.value]));
    res.status(200).json({
      data: {
        platformFeePercentage: map.get('PLATFORM_FEE_PERCENTAGE') || '0',
        platformFeeFixed: map.get('PLATFORM_FEE_FIXED') || '0',
      },
    });
    return;
  }

  if (req.method === 'PUT') {
    const { platformFeePercentage, platformFeeFixed } = req.body || {};
    const percentage = String(platformFeePercentage ?? '0').trim();
    const fixed = String(platformFeeFixed ?? '0').trim();

    try {
      await Promise.all([
        upsertConfig({ key: 'PLATFORM_FEE_PERCENTAGE', value: percentage, category: 'PAYMENT' }),
        upsertConfig({ key: 'PLATFORM_FEE_FIXED', value: fixed, category: 'PAYMENT' }),
      ]);
      res.status(200).json({ data: { saved: true } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to save revenue settings' } });
    }
    return;
  }

  res.status(405).json({ error: { msg: 'Method not supported' } });
}

