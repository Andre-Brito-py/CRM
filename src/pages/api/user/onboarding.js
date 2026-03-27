import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
    const session = await validateSession(req, res);

    if (!session) return;

    const userId = session.user.userId || session.user.id;

    if (!userId) {
        res.status(400).json({ error: { msg: 'User ID missing in session' } });
        return;
    }

    if (req.method === 'GET') {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { onboardingStatus: true },
            });
            res.status(200).json({ data: user.onboardingStatus || {} });
        } catch (error) {
            console.error('Onboarding GET Error:', error);
            res.status(500).json({ error: { msg: 'Failed to fetch onboarding status' } });
        }
    } else if (req.method === 'POST') {
        const { tourId, completed } = req.body;

        if (!tourId) {
            res.status(400).json({ error: { msg: 'tourId is required' } });
            return;
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { onboardingStatus: true },
            });

            const currentStatus = user.onboardingStatus || {};
            const newStatus = {
                ...currentStatus,
                [tourId]: completed ? true : (currentStatus[tourId] || false),
            };

            await prisma.user.update({
                where: { id: userId },
                data: { onboardingStatus: newStatus },
            });

            res.status(200).json({ data: newStatus });
        } catch (error) {
            console.error('Onboarding POST Error:', error);
            res.status(500).json({ error: { msg: 'Failed to update onboarding status' } });
        }
    } else {
        res.status(405).json({ error: { msg: 'Method not supported' } });
    }
}
