import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, export: exportCSV } = req.query;

  try {
    const session = await validateSession(req, res);
    if (!session) return;

    if (method === 'GET') {
      const workspace = await getWorkspace(
        session.user.userId || session.user.id,
        session.user.email,
        workspaceSlug
      );

      if (!workspace) {
        return res.status(404).json({ error: { msg: 'Workspace not found' } });
      }

      const bookings = await prisma.booking.findMany({
        where: { workspaceId: workspace.id },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true }
          }
        },
        orderBy: { startAt: 'desc' },
      });

      if (exportCSV === 'true') {
        const header = ['ID', 'Titulo', 'Status', 'Inicio', 'Termino', 'Cliente', 'Telefone', 'E-mail', 'Criado em'].join(';');
        const rows = bookings.map(b => [
          b.id,
          `"${(b.title || '').replace(/"/g, '""')}"`,
          b.status,
          b.startAt.toISOString(),
          b.endAt.toISOString(),
          `"${(b.contact?.name || '').replace(/"/g, '""')}"`,
          b.contact?.phone || '',
          b.contact?.email || '',
          b.createdAt.toISOString()
        ].join(';'));
        
        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="agendamentos_${workspaceSlug}.csv"`);
        return res.status(200).send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
      }

      return res.status(200).json({ data: { bookings } });
    } else {
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
    }
  } catch (error) {
    res.status(500).json({ error: { msg: error.message } });
  }
};

export default handler;
