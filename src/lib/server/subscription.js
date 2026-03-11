import prisma from '@/prisma/index';

/**
 * Retorna o status da assinatura de um usuário (FREE, STANDARD, PREMIUM)
 */
export const getSubscriptionStatus = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { role: true },
    });

    if (user?.role === 'SUPERADMIN') return 'PREMIUM';

    const customerPayment = await prisma.customerPayment.findUnique({
        where: { email },
    });

    return customerPayment?.subscriptionType || 'FREE';
};

export const hasPremiumAccess = async (email) => {
    const plan = await getSubscriptionStatus(email);
    return plan === 'PREMIUM';
};

export const hasStandardAccess = async (email) => {
    const plan = await getSubscriptionStatus(email);
    return plan === 'STANDARD' || plan === 'PREMIUM';
};

export const canAddWorkspaceMembers = async (workspaceCreatorEmail, currentMemberCount) => {
    const plan = await getSubscriptionStatus(workspaceCreatorEmail);

    if (plan === 'PREMIUM') return true;
    if (plan === 'STANDARD' && currentMemberCount < 10) return true;
    if (plan === 'FREE' && currentMemberCount < 3) return true;

    return false;
};

/**
 * Validation to check how many WhatsApp numbers a user can connect
 */
export const canAddWhatsAppIntegration = async (workspaceCreatorEmail, currentWAintegrationsCount) => {
    const plan = await getSubscriptionStatus(workspaceCreatorEmail);

    if (plan === 'PREMIUM') return true; // Unlimited
    if (plan === 'STANDARD' && currentWAintegrationsCount < 5) return true; // Max 5
    if (plan === 'FREE' && currentWAintegrationsCount < 1) return true; // Max 1

    return false;
};

/**
 * Validation to check how many Contacts a workspace can have
 */
export const canAddContact = async (workspaceCreatorEmail, currentContactCount) => {
    const plan = await getSubscriptionStatus(workspaceCreatorEmail);

    if (plan === 'PREMIUM') return true; // Unlimited
    if (plan === 'STANDARD') return true; // Unlimited
    if (plan === 'FREE' && currentContactCount < 100) return true; // Max 100

    return false;
};
