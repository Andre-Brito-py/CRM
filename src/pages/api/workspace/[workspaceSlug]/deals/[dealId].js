import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getDeal, updateDeal, deleteDeal } from '@/prisma/services/deal';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug, dealId } = req.query;
  const workspace = await getWorkspace(
    session.user.userId,
    session.user.email,
    workspaceSlug
  );

  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isMember = workspace.members.some(
    (member) => member.email === session.user.email
  );

  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  switch (req.method) {
    case 'GET': {
      const deal = await getDeal(dealId, workspace.id);
      if (!deal) {
        res.status(404).json({ error: { msg: 'Deal not found' } });
        return;
      }
      res.status(200).json({ data: { deal } });
      break;
    }
    case 'PUT': {
      const deal = await getDeal(dealId, workspace.id);
      if (!deal) {
        res.status(404).json({ error: { msg: 'Deal not found' } });
        return;
      }

      const updatedDeal = await updateDeal(dealId, workspace.id, req.body);
      res.status(200).json({ data: { deal: updatedDeal } });
      break;
    }
    case 'DELETE': {
      const deal = await getDeal(dealId, workspace.id);
      if (!deal) {
        res.status(404).json({ error: { msg: 'Deal not found' } });
        return;
      }

      await deleteDeal(dealId, workspace.id);
      res.status(200).json({ data: { msg: 'Deal deleted' } });
      break;
    }
    default:
      res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
