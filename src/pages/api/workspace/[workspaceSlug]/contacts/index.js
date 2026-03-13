import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { createContact, getContacts } from '@/prisma/services/contact';
import { getWorkspace } from '@/prisma/services/workspace';
import { canAddContact } from '@/lib/server/subscription';

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
    case 'GET': {
      try {
        const page = parsePositiveInt(req.query.page);
        const pageSizeRaw = parsePositiveInt(req.query.pageSize);
        const pageSize = pageSizeRaw ? Math.min(100, pageSizeRaw) : null;

        if (page && pageSize) {
          const skip = (page - 1) * pageSize;
          const [contacts, total] = await Promise.all([
            getContacts(workspace.id, { take: pageSize, skip }),
            prisma.contact.count({ where: { workspaceId: workspace.id } }),
          ]);

          const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
          return res.status(200).json({
            data: {
              contacts,
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

        const contacts = await getContacts(workspace.id);
        return res.status(200).json({ data: { contacts } });
      } catch (error) {
        console.error('getContacts error:', error);
        return res.status(500).json({ error: { msg: 'Unable to fetch contacts' } });
      }
    }

    case 'POST': {
      try {
        const { name, email, phone, jobTitle, companyId, customFields } = req.body;

        if (!name) {
          return res.status(400).json({ error: { msg: 'Name is required' } });
        }

        const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
        if (isSuperAdmin) {
          const contact = await createContact(workspace.id, {
            name, email, phone, jobTitle, companyId, customFields,
          });

          prisma.activity.create({
            data: {
              workspaceId: workspace.id,
              userId: session.user.userId,
              type: 'CONTACT_CREATED',
              title: `Contact "${name}" created`,
              contactId: contact.id,
            },
          }).catch((err) => console.error('Activity log failed:', err));

          return res.status(201).json({ data: { contact } });
        }

        // Run count and permission check in parallel — no dynamic imports
        const [currentContactCount] = await Promise.all([
          prisma.contact.count({ where: { workspaceId: workspace.id } }),
        ]);

        const isAllowed = await canAddContact(workspace.id, currentContactCount);
        if (!isAllowed) {
          return res.status(403).json({
            error: {
              msg: 'LIMIT_REACHED',
              details: 'Você atingiu o limite de contatos do seu plano. Faça um upgrade para adicionar mais.',
            },
          });
        }

        const contact = await createContact(workspace.id, {
          name, email, phone, jobTitle, companyId, customFields,
        });

        // Fire-and-forget activity log — don't block the response
        prisma.activity.create({
          data: {
            workspaceId: workspace.id,
            userId: session.user.userId,
            type: 'CONTACT_CREATED',
            title: `Contact "${name}" created`,
            contactId: contact.id,
          },
        }).catch((err) => console.error('Activity log failed:', err));

        res.status(201).json({ data: { contact } });
      } catch (error) {
        console.error('createContact error:', error);
        res.status(500).json({ error: { msg: 'Unable to create contact' } });
      }
      break;
    }

    default:
      res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
