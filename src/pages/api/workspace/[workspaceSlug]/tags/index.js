import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import { getTags, createTag } from '@/prisma/services/tag';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

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
      const tags = await getTags(workspace.id);
      res.status(200).json({ data: { tags } });
      break;
    }
    case 'POST': {
      const { name, color } = req.body;
      const tag = await createTag(workspace.id, { name, color });
      res.status(201).json({ data: { tag } });
      break;
    }
    default:
      res.status(405).json({ error: { msg: 'Method not supported' } });
  }
}
