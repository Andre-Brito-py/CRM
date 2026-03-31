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

    // Configs do Painel Admin (Boolean cast handling)
    const isWaEnabledStr = await getSystemConfig('ADDON_WA_ENABLED', 'true');
    const isWaEnabled = typeof isWaEnabledStr === 'boolean' ? isWaEnabledStr : String(isWaEnabledStr).trim().toLowerCase() !== 'false';

    const waPrice = await getSystemConfig('ADDON_WA_PRICE', 49.90);
    const waQuantity = await getSystemConfig('ADDON_WA_QUANTITY', 10000);

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
        addons: {
          whatsapp: {
            enabled: isWaEnabled,
            price: Number(waPrice),
            quantity: Number(waQuantity),
          },
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
