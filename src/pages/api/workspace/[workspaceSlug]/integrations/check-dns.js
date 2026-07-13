import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { verifyDomainDns } from '@/lib/server/dns-checker';

export default async function handler(req, res) {
  const session = await validateSession(req, res);

  if (!session) {
    return;
  }

  const { workspaceSlug } = req.query;

  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug, deletedAt: null },
    select: { id: true },
  });

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  const isMember = await prisma.member.findFirst({
    where: {
      workspaceId: workspace.id,
      email: session.user.email,
      deletedAt: null,
    },
  });

  if (!isMember) {
    return res.status(403).json({ error: { msg: 'Forbidden' } });
  }

  if (req.method === 'POST') {
    const { domain, selector } = req.body;

    if (!domain) {
      return res.status(400).json({ error: { msg: 'Missing domain parameter' } });
    }

    try {
      const dnsResult = await verifyDomainDns(domain, selector || 'default');
      return res.status(200).json({ data: dnsResult });
    } catch (error) {
      console.error('[check-dns-api] Error verifying DNS:', error);
      return res.status(500).json({ error: { msg: 'Failed to verify DNS records: ' + error.message } });
    }
  }

  return res.status(405).json({ error: { msg: 'Method not supported' } });
}
