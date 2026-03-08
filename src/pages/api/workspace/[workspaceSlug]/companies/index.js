import { validateSession } from '@/config/api-validation';
import { createCompany, getCompanies } from '@/prisma/services/company';
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
        const companies = await getCompanies(workspace.id);
        res.status(200).json({ data: { companies } });
      } catch (error) {
        res.status(500).json({ error: { msg: 'Unable to fetch companies' } });
      }
      break;

    case 'POST':
      try {
        const { name, website, industry } = req.body;

        // Basic validation
        if (!name) {
          return res.status(400).json({ error: { msg: 'Name is required' } });
        }

        const company = await createCompany(workspace.id, {
          name,
          website,
          industry,
        });

        await createActivity(workspace.id, session.user.userId, {
          type: 'COMPANY_CREATED',
          title: `Company "${name}" created`,
        });

        res.status(201).json({ data: { company } });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: { msg: 'Unable to create company' } });
      }
      break;

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
