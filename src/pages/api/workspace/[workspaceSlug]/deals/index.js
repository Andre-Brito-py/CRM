import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { createDeal, getDeals, updateDeal } from '@/prisma/services/deal';
import { getWorkspace } from '@/prisma/services/workspace';
import { createActivity } from '@/prisma/services/activity';

const parsePositiveInt = (value) => {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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

  switch (method) {
    case 'GET':
      try {
        const compact =
          req.query.compact === '1' || req.query.compact === 'true' || req.query.compact === true;

        const page = parsePositiveInt(req.query.page) || 1;
        const pageSizeRaw = parsePositiveInt(req.query.pageSize);
        const pageSizeMax = compact ? 1000 : 200;
        const pageSize = pageSizeRaw ? Math.min(pageSizeMax, pageSizeRaw) : Math.min(pageSizeMax, 200);
        const skip = (page - 1) * pageSize;

        const [deals, total] = await Promise.all([
          getDeals(workspace.id, { take: pageSize, skip, compact }),
          prisma.deal.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
        ]);

        const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
        res.status(200).json({
          data: {
            deals,
            meta: {
              page,
              pageSize,
              total,
              totalPages,
              hasMore: page < totalPages,
              compact,
            },
          },
        });
      } catch (error) {
        res.status(500).json({ error: { msg: 'Unable to fetch deals' } });
      }
      break;

    case 'POST':
      try {
        const { name, stageId, amount, closeDate, priority, contactId, companyId, userId, customFields } = req.body;

        if (!name || !stageId) {
          return res.status(400).json({ error: { msg: 'Name and Stage are required' } });
        }

        const deal = await createDeal(workspace.id, {
          name,
          stageId,
          amount: amount ? parseFloat(amount) : null,
          closeDate: closeDate ? new Date(closeDate) : null,
          priority,
          contactId,
          companyId,
          userId,
          customFields
        });

        await createActivity(workspace.id, session.user.userId, {
          type: 'DEAL_CREATED',
          title: `Deal "${name}" created`,
          dealId: deal.id,
        });

        res.status(201).json({ data: { deal } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create deal' } });
      }
      break;

    case 'PUT':
      try {
        const { id, ...data } = req.body;
        const updatedDeal = await updateDeal(id, data);

        await createActivity(workspace.id, session.user.userId, {
          type: 'DEAL_UPDATED',
          title: `Deal updated`,
          dealId: id,
        });

        res.status(200).json({ data: { deal: updatedDeal } });
      } catch (error) {
        res.status(500).json({ error: { msg: 'Unable to update deal' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
