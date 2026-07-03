import { validateSession } from '@/config/api-validation';
import { deactivate, deleteUserCompletely } from '@/prisma/services/user';
import getStripe from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import prisma from '@/prisma/index';
import { log, reportError } from '@/lib/server/logger';
import { deleteWorkspace } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (method === 'DELETE') {
    try {
      const session = await validateSession(req, res);
      if (!session?.user?.email || !session?.user?.userId) {
        return res.status(401).json({ errors: { error: { msg: 'Unauthorized' } } });
      }

      const email = session.user.email;
      const userId = session.user.userId;

      // 1. Cancel User's personal subscription on Stripe
      const customerPayment = await getPayment(email);
      if (customerPayment?.providerSubscriptionId) {
        try {
          const stripe = await getStripe();
          await stripe.subscriptions.del(customerPayment.providerSubscriptionId);
          log({ level: 'info', msg: 'stripe_personal_subscription_canceled_on_deactivation', requestId, userId, subscriptionId: customerPayment.providerSubscriptionId });
        } catch (stripeError) {
          log({ level: 'error', msg: 'stripe_personal_subscription_cancel_failed_on_deactivation', requestId, userId, subscriptionId: customerPayment.providerSubscriptionId, error: stripeError });
        }
      }

      // Check if there is an active FREE plan configured in the database
      const freePlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { slug: { equals: 'free', mode: 'insensitive' } },
            { features: { path: ['isFreePlan'], equals: true } }
          ],
          isActive: true
        }
      });

      const hasFreePlan = !!freePlan;

      // 2. Process all workspaces owned/created by the user
      const ownedWorkspaces = await prisma.workspace.findMany({
        where: { creatorId: userId, deletedAt: null },
        include: { platformSubscription: true }
      });

      for (const workspace of ownedWorkspaces) {
        const subId = workspace.platformSubscription?.providerSubscriptionId;
        if (subId) {
          try {
            const stripe = await getStripe();
            await stripe.subscriptions.del(subId);
            log({ level: 'info', msg: 'stripe_workspace_subscription_canceled_on_deactivation', requestId, workspaceId: workspace.id, subscriptionId: subId });
          } catch (stripeError) {
            log({ level: 'error', msg: 'stripe_workspace_subscription_cancel_failed_on_deactivation', requestId, workspaceId: workspace.id, subscriptionId: subId, error: stripeError });
          }
        }
        
        if (!hasFreePlan) {
          // If no free plan exists, delete/cancel the workspace completely using standard deleteWorkspace
          try {
            await deleteWorkspace(userId, email, workspace.slug);
            log({ level: 'info', msg: 'workspace_deleted_on_user_hard_delete', requestId, workspaceId: workspace.id });
          } catch (wsError) {
            log({ level: 'error', msg: 'failed_to_delete_owned_workspace_on_user_hard_delete', requestId, workspaceId: workspace.id, error: wsError });
          }
        } else {
          // If free plan exists, just remove the paid subscription in DB (it will fallback to free limits)
          await prisma.platformSubscription.deleteMany({
            where: { workspaceId: workspace.id }
          });
        }
      }

      if (hasFreePlan) {
        // Update customer payment record to free
        if (customerPayment) {
          await prisma.customerPayment.updateMany({
            where: { paymentId: customerPayment.paymentId },
            data: {
              subscriptionType: 'FREE',
              providerSubscriptionId: null,
              currentPeriodEnd: null,
              pendingSubscriptionType: null,
              pendingEffectiveAt: null,
              pendingStripePriceId: null
            }
          });
        }

        // Deactivate the user account (soft delete)
        await deactivate(userId);
        log({ level: 'info', msg: 'user_deactivated_soft', requestId, userId });
      } else {
        // Permanently delete the user account and clean up relations
        await deleteUserCompletely(userId, email);
        log({ level: 'info', msg: 'user_deleted_permanently', requestId, userId });
      }

      res.status(200).json({ data: { email } });
    } catch (error) {
      log({ level: 'error', msg: 'user_deactivation_failed', requestId, error });
      reportError(error, { route: '/api/user', method: 'DELETE', requestId });
      res.status(500).json({ errors: { error: { msg: 'Unable to deactivate account' } } });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
