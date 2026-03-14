import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { log, reportError } from '@/lib/server/logger';

const handler = async (req, res) => {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const method = req.method;

  if (method !== 'POST') {
    res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    return;
  }

  const termsVersion = process.env.TERMS_VERSION || process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-03-13';

  try {
    const session = await validateSession(req, res);
    const userId = session?.user?.id || null;

    if (!userId) {
      res.status(401).json({ errors: { error: { msg: 'Unauthorized' } } });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { termsVersion, termsAcceptedAt: new Date() },
      select: { termsVersion: true, termsAcceptedAt: true },
    });

    res.status(200).json({
      data: {
        termsVersion: updatedUser.termsVersion,
        termsAcceptedAt: updatedUser.termsAcceptedAt
          ? new Date(updatedUser.termsAcceptedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'accept_terms_failed', requestId, error });
    reportError(error, { route: '/api/legal/accept-terms', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to accept terms' } } });
  }
};

export default handler;
