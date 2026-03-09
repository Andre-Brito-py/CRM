import { getSession } from 'next-auth/react';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
    const session = await getSession({ req });
    if (!session) {
        res.status(401).json({ error: { msg: 'Unauthorized' } });
        return;
    }

    const { workspaceSlug, integrationId } = req.query;
    const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

    if (!workspace) {
        res.status(404).json({ error: { msg: 'Workspace not found' } });
        return;
    }

    const isMember = workspace.members.some(
        (member) => member.email === session.user.email
    );

    if (!isMember) {
        res.status(403).json({ error: { msg: 'Forbidden' } });
        return;
    }

    // Validate ownership of the integration
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
    });

    if (!integration || integration.workspaceId !== workspace.id) {
        res.status(404).json({ error: { msg: 'Integration not found' } });
        return;
    }

    if (req.method === 'PUT') {
        const { name, enabled, phoneNumberId, accessToken, verifyToken, businessAccountId } = req.body;

        try {
            const updatedIntegration = await prisma.integration.update({
                where: { id: integrationId },
                data: {
                    name,
                    enabled,
                    credentials: {
                        ...(integration.credentials || {}),
                        phoneNumberId: phoneNumberId || integration.credentials?.phoneNumberId,
                        accessToken: accessToken || integration.credentials?.accessToken,
                        verifyToken: verifyToken || integration.credentials?.verifyToken,
                        businessAccountId: businessAccountId || integration.credentials?.businessAccountId,
                    },
                },
            });

            res.status(200).json({ data: { integration: updatedIntegration } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: { msg: 'Failed to update integration' } });
        }
    } else if (req.method === 'DELETE') {
        try {
            await prisma.integration.delete({
                where: { id: integrationId },
            });

            res.status(200).json({ data: { success: true } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: { msg: 'Failed to delete integration' } });
        }
    } else {
        res.status(405).json({ error: { msg: 'Method not supported' } });
    }
}
