import { validateSession } from '@/config/api-validation';
import { getPayment } from '@/prisma/services/customer';
import { log, reportError } from '@/lib/server/logger';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const method = req.method;

  if (method !== 'GET') {
    res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    return;
  }

  try {
    const session = await validateSession(req, res);
    const { workspaceSlug } = req.query;
    
    let plan = null;
    let subscriptionType = 'FREE';

    // 1. First, check if there is a specific subscription for this workspace
    if (workspaceSlug) {
      const workspace = await prisma.workspace.findFirst({
        where: { slug: workspaceSlug, deletedAt: null },
        include: {
          platformSubscription: {
            include: { plan: true }
          }
        }
      });
      
      if (workspace?.platformSubscription?.plan) {
        plan = workspace.platformSubscription.plan;
        subscriptionType = plan.slug?.toUpperCase() || 'STANDARD';
      }
    }

    // 2. If no workspace plan found, fallback to user-level customerPayment
    const customerPayment = await getPayment(session.user?.email);
    if (!plan && customerPayment) {
      subscriptionType = customerPayment.subscriptionType || 'FREE';
      
      // Try to find a plan that matches this subscription type by slug
      plan = await prisma.plan.findFirst({
        where: { 
          slug: { equals: subscriptionType.toLowerCase() },
          isActive: true 
        }
      });

      // Special fallback if 'FREE' is used but slug is different
      if (!plan && subscriptionType === 'FREE') {
        plan = await prisma.plan.findFirst({
          where: { features: { path: ['isFreePlan'], equals: true } }
        });
      }
    }

    res.status(200).json({
      data: {
        subscriptionType,
        planName: plan?.name || (subscriptionType === 'FREE' ? 'Grátis' : subscriptionType),
        features: plan?.features || {
          isFreePlan: subscriptionType === 'FREE'
        },
        currentPeriodEnd: customerPayment?.currentPeriodEnd
          ? new Date(customerPayment.currentPeriodEnd).toISOString()
          : null,
        pending: customerPayment?.pendingSubscriptionType
          ? {
              subscriptionType: customerPayment.pendingSubscriptionType,
              effectiveAt: customerPayment?.pendingEffectiveAt
                ? new Date(customerPayment.pendingEffectiveAt).toISOString()
                : null,
            }
          : null,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'subscription_status_failed', requestId, error });
    reportError(error, { route: '/api/payments/subscription/status', requestId });
    res.status(500).json({ errors: { error: { msg: 'Unable to fetch subscription status' } } });
  }
};

export default handler;

