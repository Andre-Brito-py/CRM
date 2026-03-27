import { validateSession } from '@/config/api-validation/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { getSystemConfig } from '@/lib/server/config';
import { getWorkspaceLimits, isModuleAllowed } from '@/lib/server/subscription';
import prisma from '@/prisma/index';
import { log } from '@/lib/server/logger';

export default async function handler(req, res) {
  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  const session = await validateSession(req, res);
  if (!session) return;

  const workspace = await getWorkspace(session.user.userId || session.user.id, session.user.email, workspaceSlug);
  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  try {
    // 1. Check AI Keys
    const googleAiApiKey = await getSystemConfig('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
    const openAiApiKey = await getSystemConfig('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    // 2. Check Plan & Modules
    const limits = await getWorkspaceLimits(workspace.id);
    const aiAllowed = await isModuleAllowed(workspace.id, 'ai_assistant');

    // 3. Check WhatsApp Integrations
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: workspace.id, provider: { in: ['WHATSAPP', 'whatsapp'] } },
      select: { id: true, provider: true, enabled: true, createdAt: true }
    });

    // 4. Connectivity Check (Simple)
    let aiStatus = 'UNKNOWN';
    if (googleAiApiKey) aiStatus = 'GOOGLE_AI_CONFIGURED';
    else if (openAiApiKey) aiStatus = 'OPENAI_CONFIGURED';
    else aiStatus = 'NO_KEYS';

    res.status(200).json({
      data: {
        diagnostics: {
          timestamp: new Date().toISOString(),
          session: {
            userId: session.user.userId || session.user.id,
            email: session.user.email,
            role: session.user.role || 'USER',
          },
          workspace: {
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            ownerId: workspace.creatorId,
          },
          ai: {
            googleKeyPresent: !!googleAiApiKey,
            openAiKeyPresent: !!openAiApiKey,
            moduleAllowed: aiAllowed,
            plan: limits.plan,
            limits: {
              requests24h: limits.aiRequests24h,
              tokens24h: limits.aiTokens24h,
            },
            status: aiStatus
          },
          integrations: {
            count: integrations.length,
            items: integrations,
          }
        }
      }
    });

  } catch (error) {
    log({ level: 'error', msg: 'ai_debug_failed', requestId, workspaceId: workspace.id, error });
    res.status(500).json({ error: { msg: 'Diagnostic failed', details: error.message } });
  }
}
