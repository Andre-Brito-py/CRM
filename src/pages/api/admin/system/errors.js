import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

export default async function handler(req, res) {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [errors, total] = await Promise.all([
        prisma.systemError.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.systemError.count(),
      ]);

      return res.status(200).json({
        data: {
          errors,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      return res.status(500).json({ error: { msg: error?.message || 'Failed to fetch errors' } });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { all } = req.query;

      if (all === 'true') {
        await prisma.systemError.deleteMany({});
      } else {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: { msg: 'Missing error ID' } });
        await prisma.systemError.delete({ where: { id } });
      }

      return res.status(200).json({ data: { success: true } });
    } catch (error) {
      return res.status(500).json({ error: { msg: error?.message || 'Failed to delete error(s)' } });
    }
  }

  return res.status(405).json({ error: { msg: 'Method not supported' } });
}
