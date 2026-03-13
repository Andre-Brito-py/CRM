import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { createTask, getTasks } from '@/prisma/services/task';
import { getWorkspace } from '@/prisma/services/workspace';

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
        const isCompleted =
          req.query.isCompleted === 'true'
            ? true
            : req.query.isCompleted === 'false'
              ? false
              : undefined;

        const where = {
          workspaceId: workspace.id,
          deletedAt: null,
          ...(req.query.assigneeId ? { assigneeId: String(req.query.assigneeId) } : {}),
          ...(req.query.contactId ? { contactId: String(req.query.contactId) } : {}),
          ...(req.query.dealId ? { dealId: String(req.query.dealId) } : {}),
          ...(isCompleted !== undefined ? { isCompleted } : {}),
        };

        const filters = {
          assigneeId: where.assigneeId,
          contactId: where.contactId,
          dealId: where.dealId,
          isCompleted,
        };

        const page = parsePositiveInt(req.query.page);
        const pageSizeRaw = parsePositiveInt(req.query.pageSize);
        const pageSize = pageSizeRaw ? Math.min(100, pageSizeRaw) : null;

        if (page && pageSize) {
          const skip = (page - 1) * pageSize;
          const [tasks, total] = await Promise.all([
            getTasks(workspace.id, { ...filters, take: pageSize, skip }),
            prisma.task.count({ where }),
          ]);

          const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
          return res.status(200).json({
            data: {
              tasks,
              meta: {
                page,
                pageSize,
                total,
                totalPages,
                hasMore: page < totalPages,
              },
            },
          });
        }

        const tasks = await getTasks(workspace.id, filters);
        return res.status(200).json({ data: { tasks } });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: { msg: 'Unable to fetch tasks' } });
      }

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
