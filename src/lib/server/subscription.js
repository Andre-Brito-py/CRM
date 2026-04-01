import prisma from '@/prisma/index';
import getStripe from '@/lib/server/stripe';

// -----------------------------------------------------------------
// Módulos padrão para planos legados (sem features.allowedModules)
// -----------------------------------------------------------------
const DEFAULT_FREE_MODULES = {
    inbox: true,
    pipeline: true,
    contacts: true,
    companies: true,
    deals: true,
    tasks: true,
    automations: false,
    analytics: false,
    nps: false,
    ai_assistant: true,
    email_marketing: false,
    custom_fields: false,
    templates: true,
    integrations: false,
    payments: false,
    ads: false,
};

const ALL_MODULES_ENABLED = {
    inbox: true,
    pipeline: true,
    contacts: true,
    companies: true,
    deals: true,
    tasks: true,
    automations: true,
    analytics: true,
    nps: true,
    ai_assistant: true,
    email_marketing: true,
    custom_fields: true,
    templates: true,
    integrations: true,
    payments: true,
    ads: true,
};

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
 * Agora inclui `allowedModules`, `freeTrialDays` e `trialExpiresAt`.
 */
export const getWorkspaceLimits = async (workspaceId) => {
    // 1. Tenta buscar a assinatura do sistema (PlatformSubscription)
    const subscription = await prisma.platformSubscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
    });

    if (subscription?.plan?.features) {
        const f = subscription.plan.features;
        const membersLimit =
            typeof f.maxUsers === 'number'
                ? f.maxUsers
                : f.maxUsers === null
                    ? null
                    : null;
        const pendingInvitesLimit =
            typeof f.maxPendingInvites === 'number'
                ? f.maxPendingInvites
                : typeof membersLimit === 'number'
                    ? Math.max(20, membersLimit * 5)
                    : null;
        const freeTrialDays = f.freeTrialDays || 0;

        // Calcula expiração do trial com base na data de criação da subscription
        let trialExpiresAt = null;
        if (freeTrialDays > 0) {
            const created = new Date(subscription.createdAt);
            trialExpiresAt = new Date(created.getTime() + freeTrialDays * 24 * 60 * 60 * 1000);
        }

        return {
            members: membersLimit,
            pendingInvites: pendingInvitesLimit,
            webhooks: f.maxWebhooks || f.maxUsers || null,
            automations: f.maxAutomations || null,
            whatsappIntegrations: f.maxWhatsApp || 5,
            instagramIntegrations: f.maxInstagram || 5,
            contacts: f.maxContacts || null,
            aiRequests24h: f.maxAiRequests24h || 100,
            aiTokens24h: f.maxAiTokens24h || 30000,
            uploads24h: f.maxUploads24h || 50,
            maxAdAccounts: f.maxAdAccounts || null,
            plan: subscription.plan.name,
            allowedModules: f.allowedModules || ALL_MODULES_ENABLED,
            freeTrialDays,
            trialExpiresAt,
        };
    }

    // 2. Fallback para lógica legada (SubscriptionType no User/CustomerPayment)
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { creator: { select: { email: true } }, createdAt: true }
    });

    const planType = await getSubscriptionStatus(workspace?.creator?.email);

    // Calcula trial para planos free legados (14 dias padrão)
    const legacyTrialDays = planType === 'FREE' ? 14 : 0;
    let trialExpiresAt = null;
    if (legacyTrialDays > 0 && workspace?.createdAt) {
        const created = new Date(workspace.createdAt);
        trialExpiresAt = new Date(created.getTime() + legacyTrialDays * 24 * 60 * 60 * 1000);
    }

    // Valores Legados Hardcoded
    return {
        members: planType === 'FREE' ? 3 : planType === 'STANDARD' ? 10 : null,
        pendingInvites: planType === 'FREE' ? 10 : planType === 'STANDARD' ? 50 : null,
        webhooks: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 10 : null,
        automations: planType === 'FREE' ? 3 : planType === 'STANDARD' ? 20 : null,
        whatsappIntegrations: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 5 : null,
        instagramIntegrations: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 5 : null,
        contacts: planType === 'FREE' ? 100 : null,
        aiRequests24h: planType === 'FREE' ? 100 : planType === 'STANDARD' ? 1000 : 10000,
        aiTokens24h: planType === 'FREE' ? 30000 : planType === 'STANDARD' ? 300000 : 1000000,
        uploads24h: planType === 'FREE' ? 30 : planType === 'STANDARD' ? 500 : 5000,
        maxAdAccounts: planType === 'FREE' ? 1 : null,
        plan: planType,
        allowedModules: planType === 'FREE' ? DEFAULT_FREE_MODULES : ALL_MODULES_ENABLED,
        freeTrialDays: legacyTrialDays,
        trialExpiresAt,
    };
};

// -----------------------------------------------------------------
// Verificação de módulo permitido
// -----------------------------------------------------------------
/**
 * Verifica se um módulo está habilitado para o workspace.
 * @param {string} workspaceId
 * @param {string} moduleName - ex: 'automations', 'ai_assistant', 'nps'
 * @returns {Promise<boolean>}
 */
export const isModuleAllowed = async (workspaceId, moduleName) => {
    const limits = await getWorkspaceLimits(workspaceId);
    const modules = limits.allowedModules || ALL_MODULES_ENABLED;
    // Se o módulo não existe na lista, permite por padrão (backward compat)
    return modules[moduleName] !== false;
};

// -----------------------------------------------------------------
// Verificação de trial expirado
// -----------------------------------------------------------------
/**
 * Verifica se o período de trial gratuito expirou.
 * Retorna { expired, daysLeft, trialExpiresAt }
 */
export const getTrialStatus = async (workspaceId) => {
    const limits = await getWorkspaceLimits(workspaceId);

    if (!limits.freeTrialDays || limits.freeTrialDays <= 0) {
        return { expired: false, daysLeft: null, trialExpiresAt: null, hasTrial: false };
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { creator: { select: { email: true } } },
        });
        const email = workspace?.creator?.email || null;
        if (email) {
            const customerPayment = await prisma.customerPayment.findUnique({
                where: { email },
                select: { providerSubscriptionId: true },
            });
            const subId = customerPayment?.providerSubscriptionId ? String(customerPayment.providerSubscriptionId) : null;
            if (subId) {
                const stripe = await getStripe().catch(() => null);
                if (stripe) {
                    const sub = await stripe.subscriptions.retrieve(subId).catch(() => null);
                    const trialEnd = sub?.trial_end ? new Date(Number(sub.trial_end) * 1000) : null;
                    if (trialEnd && sub?.status === 'trialing') {
                        const now = new Date();
                        const diff = trialEnd.getTime() - now.getTime();
                        const daysLeft = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
                        return {
                            expired: diff <= 0,
                            daysLeft,
                            trialExpiresAt: trialEnd.toISOString(),
                            hasTrial: true,
                        };
                    }
                }
            }
        }
    } catch { }

    const now = new Date();
    const expiresAt = limits.trialExpiresAt ? new Date(limits.trialExpiresAt) : null;

    if (!expiresAt) {
        return { expired: false, daysLeft: null, trialExpiresAt: null, hasTrial: false };
    }

    const diff = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));

    return {
        expired: diff <= 0,
        daysLeft,
        trialExpiresAt: expiresAt.toISOString(),
        hasTrial: true,
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
    return currentMemberCount <= limits.members;
};

export const canAddPendingInvites = async (workspaceId, pendingInvitesCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.pendingInvites === null) return true;
    return pendingInvitesCount <= limits.pendingInvites;
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
 * Validation to check how many Instagram numbers a user can connect
 */
export const canAddInstagramIntegration = async (workspaceId, currentIGintegrationsCount) => {
    const limits = await getWorkspaceLimits(workspaceId);
    if (limits.instagramIntegrations === null) return true;
    return currentIGintegrationsCount < limits.instagramIntegrations;
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
