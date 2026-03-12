import { validateSession } from '@/config/api-validation';
import { getTask, updateTask, deleteTask } from '@/prisma/services/task';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, taskId } = req.query;
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

  const task = await getTask(taskId);

  if (!task || task.workspaceId !== workspace.id) {
    return res.status(404).json({ error: { msg: 'Task not found' } });
  }

  switch (method) {
    case 'GET':
      res.status(200).json({ data: { task } });
      break;

    case 'PUT':
      try {
        const { title, content, dueDate, priority, isCompleted, assigneeId, contactId, dealId } = req.body;

        const updatedTask = await updateTask(taskId, {
          title,
          content,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          isCompleted,
          assigneeId,
          contactId,
          dealId,
        });

        res.status(200).json({ data: { task: updatedTask } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to update task' } });
      }
      break;

    case 'DELETE':
      try {
        await deleteTask(taskId);
        res.status(200).json({ data: { msg: 'Task deleted successfully' } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to delete task' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
