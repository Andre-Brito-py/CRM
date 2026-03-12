import { validateSession } from '@/config/api-validation';
import { createDeal, getDeals, updateDeal } from '@/prisma/services/deal';
import { getWorkspace } from '@/prisma/services/workspace';
import { createActivity } from '@/prisma/services/activity';

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
        const deals = await getDeals(workspace.id);
        res.status(200).json({ data: { deals } });
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
