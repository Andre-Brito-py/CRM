import prisma from '@/prisma/index';
import { requireSuperAdmin } from '@/lib/server/requireSuperAdmin';

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

const safeQuery = async (fn, fallback) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const delimiter = parseDelimiter(req);
  const today = new Date().toISOString().split('T')[0];
  const filename = `vysify-admin-export-${today}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200);
  res.write('\ufeff');

  const exportedAt = new Date().toISOString();
  csvWriteRow(res, ['Vysify Admin Export', exportedAt, session.user.email || ''], delimiter);
  csvWriteRow(res, [], delimiter);

  const workspaces = await prisma.workspace.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: {
          email: true,
          name: true,
          customerPayment: { select: { subscriptionType: true } },
        },
      },
    },
  });

  const [
    contactsByWorkspace,
    dealsByWorkspace,
    conversationsByWorkspace,
    membersByWorkspace,
    integrationsByWorkspace,
    paidPaymentsByWorkspace,
  ] = await Promise.all([
    safeQuery(
      () =>
        prisma.contact.groupBy({
          by: ['workspaceId'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.deal.groupBy({
          by: ['workspaceId'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.conversation.groupBy({
          by: ['workspaceId'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.member.groupBy({
          by: ['workspaceId'],
          where: { deletedAt: null, status: 'ACCEPTED' },
          _count: { _all: true },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.integration.groupBy({
          by: ['workspaceId'],
          _count: { _all: true },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.payment.groupBy({
          by: ['workspaceId'],
          where: { deletedAt: null, status: 'PAID' },
          _count: { _all: true },
          _sum: { value: true },
        }),
      []
    ),
  ]);

  const toCountMap = (rows) => {
    const m = new Map();
    for (const r of rows || []) {
      m.set(r.workspaceId, r?._count?._all ?? 0);
    }
    return m;
  };

  const contactsCount = toCountMap(contactsByWorkspace);
  const dealsCount = toCountMap(dealsByWorkspace);
  const conversationsCount = toCountMap(conversationsByWorkspace);
  const membersCount = toCountMap(membersByWorkspace);
  const integrationsCount = toCountMap(integrationsByWorkspace);

  const paidPaymentsCount = new Map();
  const paidPaymentsRevenue = new Map();
  for (const r of paidPaymentsByWorkspace || []) {
    paidPaymentsCount.set(r.workspaceId, r?._count?._all ?? 0);
    paidPaymentsRevenue.set(r.workspaceId, r?._sum?.value != null ? String(r._sum.value) : '0');
  }

  csvWriteRow(res, [
    'workspaceId',
    'slug',
    'name',
    'creatorEmail',
    'creatorName',
    'creatorPlan',
    'createdAt',
    'updatedAt',
    'contacts',
    'deals',
    'conversations',
    'membersAccepted',
    'integrations',
    'paymentsPaid',
    'revenuePaid',
  ], delimiter);

  for (const w of workspaces) {
    const plan = w.creator?.customerPayment?.subscriptionType || 'FREE';
    csvWriteRow(res, [
      w.id,
      w.slug,
      w.name,
      w.creator?.email || '',
      w.creator?.name || '',
      plan,
      w.createdAt ? new Date(w.createdAt).toISOString() : '',
      w.updatedAt ? new Date(w.updatedAt).toISOString() : '',
      contactsCount.get(w.id) || 0,
      dealsCount.get(w.id) || 0,
      conversationsCount.get(w.id) || 0,
      membersCount.get(w.id) || 0,
      integrationsCount.get(w.id) || 0,
      paidPaymentsCount.get(w.id) || 0,
      paidPaymentsRevenue.get(w.id) || '0',
    ], delimiter);
  }

  res.end();
}
