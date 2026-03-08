import { validateSession } from '@/config/api-validation';
import { createTask, getTasks } from '@/prisma/services/task';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(undefined, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  switch (method) {
    case 'GET':
      try {
        const filters = {
          assigneeId: req.query.assigneeId,
          contactId: req.query.contactId,
          dealId: req.query.dealId,
          isCompleted: req.query.isCompleted === 'true' ? true : req.query.isCompleted === 'false' ? false : undefined,
        };
        const tasks = await getTasks(workspace.id, filters);
        res.status(200).json({ data: { tasks } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to fetch tasks' } });
      }
      break;

    case 'POST':
      try {
        const { title, content, dueDate, priority, assigneeId, contactId, dealId } = req.body;

        if (!title) {
          return res.status(400).json({ error: { msg: 'Title is required' } });
        }

        const task = await createTask(workspace.id, {
          title,
          content,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority,
          assigneeId,
          contactId,
          dealId,
        });

        res.status(201).json({ data: { task } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create task' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
