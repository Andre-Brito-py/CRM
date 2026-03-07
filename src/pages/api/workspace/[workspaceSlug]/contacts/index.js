import { validateSession } from '@/config/api-validation';
import { createContact, getContacts } from '@/prisma/services/contact';
import { getWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  switch (method) {
    case 'GET':
      try {
        const contacts = await getContacts(workspace.id);
        res.status(200).json({ data: { contacts } });
      } catch (error) {
        res.status(500).json({ error: { msg: 'Unable to fetch contacts' } });
      }
      break;

    case 'POST':
      try {
        const { name, email, phone, jobTitle, companyId } = req.body;
        
        // Basic validation
        if (!name) {
          return res.status(400).json({ error: { msg: 'Name is required' } });
        }

        const contact = await createContact(workspace.id, {
          name,
          email,
          phone,
          jobTitle,
          companyId,
        });
        res.status(201).json({ data: { contact } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create contact' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
