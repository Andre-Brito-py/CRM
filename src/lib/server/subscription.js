import prisma from '@/prisma/index';

/**
 * Retorna o status da assinatura de um usuário (FREE, STANDARD, PREMIUM)
 */
export const getSubscriptionStatus = async (email) => {
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

    // TODO: fetch limits from SystemConfig in the future. Static for now:
    if (plan === 'PREMIUM') return true; // Unlimited
    if (plan === 'STANDARD' && currentWAintegrationsCount < 3) return true; // Max 3
    if (plan === 'FREE' && currentWAintegrationsCount < 1) return true; // Max 1

    return false;
};
