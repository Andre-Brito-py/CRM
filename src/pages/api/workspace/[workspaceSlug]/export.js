import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';

// Helper: run a Prisma query and return fallback on failure (graceful degradation)
const safeQuery = async (fn, fallback = []) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const parseDelimiter = (req) => {
  const raw = String(req.query?.delimiter || '').trim();
  if (raw === ';' || raw === ',') return raw;
  const al = String(req.headers['accept-language'] || '').toLowerCase();
  return al.startsWith('pt') ? ';' : ',';
};

const csvEscape = (value, delimiter) => {
  if (value === null || value === undefined) return '';
  const s = value instanceof Date ? value.toISOString() : String(value);
  const needsQuote =
    s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
};

const csvWriteRow = (res, values, delimiter) => {
  const line = values.map((v) => csvEscape(v, delimiter)).join(delimiter);
  res.write(`${line}\r\n`);
};

const csvStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workspaceSlug } = req.query;

  try {
    // 1. Validate permissions
    const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(403).json({ error: 'Forbidden or Workspace not found' });
    }

    const format = String(req.query?.format || '').trim().toLowerCase();
    const entity = String(req.query?.entity || '').trim().toLowerCase();
    const delimiter = parseDelimiter(req);

    if (format === 'csv') {
      const today = new Date().toISOString().split('T')[0];

      if (entity === 'contacts') {
        const filename = `contacts-${workspaceSlug}-${today}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200);
        res.write('\ufeff');

        csvWriteRow(res, [
          'id',
          'name',
          'email',
          'phone',
          'jobTitle',
          'company',
          'tags',
          'createdAt',
          'updatedAt',
          'customFields',
        ], delimiter);

        let cursorId = null;
        while (true) {
          const batch = await prisma.contact.findMany({
            where: { workspaceId: workspace.id, deletedAt: null },
            orderBy: { id: 'asc' },
            take: 1000,
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              jobTitle: true,
              createdAt: true,
              updatedAt: true,
              customFields: true,
              company: { select: { name: true } },
              tags: { select: { name: true } },
            },
          });

          if (!batch.length) break;

          for (const c of batch) {
            csvWriteRow(res, [
              c.id,
              c.name,
              c.email || '',
              c.phone || '',
              c.jobTitle || '',
              c.company?.name || '',
              (c.tags || []).map((t) => t.name).join(', '),
              c.createdAt ? new Date(c.createdAt).toISOString() : '',
              c.updatedAt ? new Date(c.updatedAt).toISOString() : '',
              csvStringify(c.customFields),
            ], delimiter);
          }

          cursorId = batch[batch.length - 1].id;
        }

        res.end();
        return;
      }

      if (entity === 'deals') {
        const filename = `deals-${workspaceSlug}-${today}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200);
        res.write('\ufeff');

        csvWriteRow(res, [
          'id',
          'name',
          'stage',
          'priority',
          'amount',
          'closeDate',
          'assignee',
          'contact',
          'contactEmail',
          'contactPhone',
          'company',
          'createdAt',
          'updatedAt',
          'customFields',
        ], delimiter);

        let cursorId = null;
        while (true) {
          const batch = await prisma.deal.findMany({
            where: { workspaceId: workspace.id, deletedAt: null },
            orderBy: { id: 'asc' },
            take: 1000,
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
            select: {
              id: true,
              name: true,
              priority: true,
              amount: true,
              closeDate: true,
              createdAt: true,
              updatedAt: true,
              customFields: true,
              stage: { select: { name: true } },
              company: { select: { name: true } },
              contact: { select: { name: true, email: true, phone: true } },
              assignee: { select: { name: true, email: true } },
            },
          });

          if (!batch.length) break;

          for (const d of batch) {
            csvWriteRow(res, [
              d.id,
              d.name,
              d.stage?.name || '',
              d.priority || '',
              d.amount != null ? String(d.amount) : '',
              d.closeDate ? new Date(d.closeDate).toISOString() : '',
              d.assignee?.email || d.assignee?.name || '',
              d.contact?.name || '',
              d.contact?.email || '',
              d.contact?.phone || '',
              d.company?.name || '',
              d.createdAt ? new Date(d.createdAt).toISOString() : '',
              d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
              csvStringify(d.customFields),
            ], delimiter);
          }

          cursorId = batch[batch.length - 1].id;
        }

        res.end();
        return;
      }

      return res.status(400).json({ error: 'Invalid export entity. Use entity=contacts or entity=deals' });
    }

    // 2. Fetch workspace data — each query is individually guarded to avoid total failure
    const [workspaceInfo, pipelines, contacts, deals, customFields, webForms, tags] =
      await Promise.all([
        safeQuery(
          () =>
            prisma.workspace.findUnique({
              where: { id: workspace.id },
              select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
            }),
          null
        ),
        safeQuery(() =>
          prisma.pipeline.findMany({
            where: { workspaceId: workspace.id },
            include: { stages: true },
          })
        ),
        safeQuery(() =>
          prisma.contact.findMany({
            where: { workspaceId: workspace.id },
            include: { activities: true },
          })
        ),
        safeQuery(() =>
          prisma.deal.findMany({
            where: { workspaceId: workspace.id },
            include: {
              activities: true,
              contact: { select: { id: true, name: true, email: true } },
            },
          })
        ),
        safeQuery(() =>
          prisma.customField.findMany({ where: { workspaceId: workspace.id } })
        ),
        // WebForm & Tag: gracefully skip if not in this schema version
        safeQuery(async () => {
          if (!prisma.webForm) return [];
          return prisma.webForm.findMany({ where: { workspaceId: workspace.id } });
        }),
        safeQuery(async () => {
          if (!prisma.tag) return [];
          return prisma.tag.findMany({ where: { workspaceId: workspace.id } });
        }),
      ]);

    // 3. Build export payload
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        requestedBy: session.user.email,
        workspaceId: workspaceInfo?.id ?? workspace.id,
        workspaceName: workspaceInfo?.name ?? workspaceSlug,
      },
      data: {
        workspace: workspaceInfo,
        pipelines,
        contacts,
        deals,
        customFields,
        webForms,
        tags,
      },
    };

    // 4. Send as downloadable JSON attachment
    const filename = `export-${workspaceInfo?.slug ?? workspaceSlug}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(exportData);
  } catch (error) {
    console.error('Data Export Error:', error);
    return res.status(500).json({ error: 'Failed to export workspace data' });
  }
}
