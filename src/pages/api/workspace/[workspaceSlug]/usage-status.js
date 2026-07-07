import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { getSystemConfig } from '@/lib/server/config';
import { getWhatsAppUsageStats } from '@/lib/server/whatsapp-usage';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  try {
    const session = await validateSession(req, res);
    const { workspaceSlug } = req.query;

    const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    // WA Stats
    const waStats = await getWhatsAppUsageStats(workspace.id);

    // AI Stats
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60_000);
    const aiUsageSum = await prisma.aiUsageEvent.aggregate({
      where: {
        workspaceId: workspace.id,
        createdAt: { gte: twentyFourHoursAgo },
      },
      _sum: {
        tokensTotal: true,
      },
    });

    const currentAiTokens24h = aiUsageSum._sum.tokensTotal || 0;

    const { getWorkspaceLimits } = await import('@/lib/server/subscription');
    const limits = await getWorkspaceLimits(workspace.id);
    const maxAiTokens24h = limits.aiTokens24h || 0;

    const isAiEnabledStr = await getSystemConfig('ADDON_AI_ENABLED', 'true');
    const isAiEnabled = typeof isAiEnabledStr === 'boolean' ? isAiEnabledStr : String(isAiEnabledStr).trim().toLowerCase() !== 'false';

    const aiPrice = await getSystemConfig('ADDON_AI_PRICE', 29.90);
    const aiQuantity = await getSystemConfig('ADDON_AI_QUANTITY', 50000);

    return res.status(200).json({
      data: {
        workspace: {
          extraWaMessages: workspace.extraWaMessages || 0,
          extraAiTokens: workspace.extraAiTokens || 0,
        },
        whatsapp: {
          ...waStats,
        },
        ai: {
          current: currentAiTokens24h,
          max: maxAiTokens24h,
        },
        addons: {
          ai: {
            enabled: isAiEnabled,
            price: Number(aiPrice),
            quantity: Number(aiQuantity),
          }
        }
      }
    });


  } catch (error) {
    console.error('[usage-status] Error:', error);
    return res.status(500).json({ error: { msg: error.message } });
  }
};

export default handler;
