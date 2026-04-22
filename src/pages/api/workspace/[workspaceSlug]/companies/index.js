import { validateSession } from '@/config/api-validation';
import { createCompany, getCompanies } from '@/prisma/services/company';
import { getWorkspace } from '@/prisma/services/workspace';

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
        const parsePositiveInt = (value) => {
          const n = Number.parseInt(String(value || ''), 10);
          if (!Number.isFinite(n) || n <= 0) return null;
          return n;
        };

        const page = parsePositiveInt(req.query.page);
        const pageSizeRaw = parsePositiveInt(req.query.pageSize);
        const pageSize = pageSizeRaw ? Math.min(100, pageSizeRaw) : null;

        if (page && pageSize) {
          const skip = (page - 1) * pageSize;
          const [companies, total] = await Promise.all([
            getCompanies(workspace.id, { take: pageSize, skip }),
            prisma.company.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
          ]);

          const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
          return res.status(200).json({
            data: {
              companies,
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

        const companies = await getCompanies(workspace.id);
        res.status(200).json({ data: { companies } });
      } catch (error) {
        console.error('getCompanies error:', error);
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
