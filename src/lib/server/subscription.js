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

/**
 * Retorna os limites dinâmicos de um workspace baseados no plano.
 */
export const getWorkspaceLimits = async (workspaceId) => {
    // 1. Tenta buscar a assinatura do sistema (PlatformSubscription)
    const subscription = await prisma.platformSubscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
    });

    if (subscription?.plan?.features) {
        const f = subscription.plan.features;
        return {
            members: f.maxUsers || null,
            webhooks: f.maxWebhooks || f.maxUsers || null, // fallback razoável
            automations: f.maxAutomations || null,
            whatsappIntegrations: f.maxWhatsApp || 5,
            contacts: f.maxContacts || null,
            aiRequests24h: f.maxAiRequests24h || 100,
            uploads24h: f.maxUploads24h || 50,
            plan: subscription.plan.name
        };
    }

    // 2. Fallback para lógica legada (SubscriptionType no User/CustomerPayment)
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { creator: { select: { email: true } } }
    });
    
    const planType = await getSubscriptionStatus(workspace?.creator?.email);
    
    // Valores Legados Hardcoded
    return {
        members: planType === 'FREE' ? 3 : planType === 'STANDARD' ? 10 : null,
        webhooks: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 10 : null,
        automations: planType === 'FREE' ? 3 : planType === 'STANDARD' ? 20 : null,
        whatsappIntegrations: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 5 : null,
        contacts: planType === 'FREE' ? 100 : null,
        aiRequests24h: planType === 'FREE' ? 100 : planType === 'STANDARD' ? 1000 : 10000,
        uploads24h: planType === 'FREE' ? 30 : planType === 'STANDARD' ? 500 : 5000,
        plan: planType
    };
};

export const hasPremiumAccess = async (email) => {
    const plan = await getSubscriptionStatus(email);
    return plan === 'PREMIUM';
};

export const hasStandardAccess = async (email) => {
    const plan = await getSubscriptionStatus(email);
    return plan === 'STANDARD' || plan === 'PREMIUM';
};

export const canAddWorkspaceMembers = async (workspaceId, currentMemberCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.members === null) return true;
    return currentMemberCount < limits.members;
};

/**
 * Validation to check how many WhatsApp numbers a user can connect
 */
export const canAddWhatsAppIntegration = async (workspaceId, currentWAintegrationsCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.whatsappIntegrations === null) return true;
    return currentWAintegrationsCount < limits.whatsappIntegrations;
};

/**
 * Validation to check how many Contacts a workspace can have
 */
export const canAddContact = async (workspaceId, currentContactCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.contacts === null) return true;
    return currentContactCount < limits.contacts;
};

export const canAddWebhook = async (workspaceId, currentWebhookCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.webhooks === null) return true;
    return currentWebhookCount < limits.webhooks;
};

export const canAddAutomationRule = async (workspaceId, currentAutomationRuleCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.automations === null) return true;
    return currentAutomationRuleCount < limits.automations;
};
