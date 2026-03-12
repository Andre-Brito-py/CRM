import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const [workspaces, providers, settings] = await Promise.all([
        prisma.workspace.findMany({
          select: { id: true, name: true, slug: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        prisma.paymentProvider.findMany({
          select: { id: true, name: true, displayName: true, status: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.workspacePaymentSetting.findMany({
          select: {
            workspaceId: true,
            providerId: true,
            providerAccountId: true,
            platformFeePercentage: true,
            platformFeeFixed: true,
            updatedAt: true,
            provider: { select: { name: true, displayName: true, status: true } },
          },
        }),
      ]);

      const map = new Map(settings.map((s) => [s.workspaceId, s]));
      res.status(200).json({
        data: {
          providers,
          workspaces: workspaces.map((w) => ({
            ...w,
            paymentSettings: map.get(w.id) || null,
          })),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to fetch workspace payment settings' } });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const {
        workspaceId,
        providerId,
        providerAccountId,
        platformFeePercentage,
        platformFeeFixed,
      } = req.body || {};

      if (!workspaceId || !providerId) {
        res.status(400).json({ error: { msg: 'workspaceId and providerId are required' } });
        return;
      }

      const data = {
        providerId: String(providerId),
        providerAccountId: providerAccountId ? String(providerAccountId) : null,
        platformFeePercentage: platformFeePercentage === '' || platformFeePercentage == null ? null : Number(platformFeePercentage),
        platformFeeFixed: platformFeeFixed === '' || platformFeeFixed == null ? null : Number(platformFeeFixed),
      };

      const saved = await prisma.workspacePaymentSetting.upsert({
        where: { workspaceId: String(workspaceId) },
        update: data,
        create: { workspaceId: String(workspaceId), ...data },
        select: { id: true, workspaceId: true, providerId: true, providerAccountId: true, platformFeePercentage: true, platformFeeFixed: true, updatedAt: true },
      });

      res.status(200).json({ data: { saved } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: { msg: 'Failed to save workspace payment settings' } });
    }
    return;
  }

  res.status(405).json({ error: { msg: 'Method not supported' } });
}

