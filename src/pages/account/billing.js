import { useEffect, useState } from 'react';
import formatDistance from 'date-fns/formatDistance';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { redirectToCheckout } from '@/lib/client/stripe';
import { getAllPlans } from '@/prisma/services/plan';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const Billing = ({ products }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [showModal, setModalVisibility] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showCancelModal, setCancelModalVisibility] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  const billingSteps = [
    {
      element: '#subscription-card',
      popover: {
        title: t('onboarding.tour.billing.step1.title'),
        description: t('onboarding.tour.billing.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#manage-plan-btn',
      popover: {
        title: t('onboarding.tour.billing.step2.title'),
        description: t('onboarding.tour.billing.step2.desc'),
        position: 'left',
      }
    },
    {
      element: '#invoices-container',
      popover: {
        title: t('onboarding.tour.billing.step3.title'),
        description: t('onboarding.tour.billing.step3.desc'),
        position: 'top',
      }
    }
  ];

  const openBillingPortal = async () => {
    setSubmittingState(true);
    try {
      const response = await api('/api/payments/portal', { method: 'POST' });
      if (response?.data?.url) {
        window.location.href = response.data.url;
        return;
      }

      const errors = response?.errors || response?.error;
      if (errors) {
        const msg = errors?.error?.msg || errors?.msg;
        if (msg) toast.error(msg);
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to open billing portal');
    } finally {
      setSubmittingState(false);
    }
  };

  const subscribe = (priceId) => {
    if (!priceId) {
      toast.error('Stripe Price ID is missing for this plan');
      return;
    }

    setSubmittingState(true);
    api(`/api/payments/subscription/${priceId}`, {
      method: 'POST',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        if (response?.data?.sessionId) {
          (async () => redirectToCheckout(response.data.sessionId))();
          return;
        }

        const action = response?.data?.action || null;
        if (action === 'scheduled') {
          const effectiveAt = response?.data?.pending?.effectiveAt
            ? new Date(response.data.pending.effectiveAt)
            : null;
          const dateLabel = effectiveAt
            ? effectiveAt.toLocaleDateString()
            : 'próxima cobrança';
          toast.success(
            `Downgrade agendado. Você mantém seu plano atual até ${dateLabel}.`
          );
          setSubscriptionStatus(response.data);
          return;
        }

        if (action === 'updated') {
          toast.success('Plano atualizado com sucesso.');
          setSubscriptionStatus(response.data);
          return;
        }

        toast.success('Solicitação processada.');
      }
    });
  };

  const handleCancelClick = async () => {
    setSubmittingState(true);
    try {
      const response = await api('/api/payments/subscription/cancel-preview', { method: 'GET' });
      if (response?.data) {
        setCancelPreview(response.data);
        setCancelModalVisibility(true);
        setModalVisibility(false);
      }
    } catch (error) {
      toast.error('Não foi possível carregar a prévia do cancelamento');
    } finally {
      setSubmittingState(false);
    }
  };

  const confirmCancellation = async () => {
    setIsCancelling(true);
    try {
      const response = await api('/api/payments/subscription/cancel-confirm', { method: 'POST' });
      if (response?.data?.success) {
        toast.success('Assinatura cancelada com sucesso');
        setCancelModalVisibility(false);
        // Refresh page or update status
        window.location.reload();
      }
    } catch (error) {
      toast.error('Erro ao processar cancelamento');
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleModal = () => setModalVisibility(!showModal);
  const currentSubscription = subscriptionStatus?.subscriptionType || session?.user?.subscription || 'FREE';

  useEffect(() => {
    let mounted = true;
    
    // Fetch subscription status
    api('/api/payments/subscription/status', { method: 'GET' })
      .then((response) => {
        if (!mounted) return;
        if (response?.data) setSubscriptionStatus(response.data);
      })
      .catch(() => { });

    // Fetch invoices from a new client-side endpoint or existing one that we'll make sure works
    api('/api/payments/invoices', { method: 'GET' })
      .then((response) => {
        if (!mounted) return;
        if (response?.data) setInvoices(response.data);
      })
      .catch((err) => {
        console.error('Failed to fetch invoices:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingInvoices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pendingDowngrade = subscriptionStatus?.pending || null;
  const pendingEffectiveAt = pendingDowngrade?.effectiveAt
    ? new Date(pendingDowngrade.effectiveAt)
    : null;

  return (
    <AccountLayout>
      <OnboardingTour tourId="billing-tour" steps={billingSteps} />
      <Meta title={`Vysify - ${t('common.label.billing')}`} />
      <Content.Title
        title={t('billing.title')}
        subtitle={t('billing.subtitle')}
        className="font-executive"
      />
      <Content.Divider />
      <Content.Container>
        <div id="subscription-card">
          <Card>
            <Card.Body
              title={t('billing.subscription.title')}
              subtitle={t('billing.subscription.status.label', { status: currentSubscription })}
            >
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                <p className="text-sm">
                  {t('billing.subscription.description')}
                </p>
              </div>
              {pendingDowngrade && (
                <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                  <div className="text-sm font-bold">
                    {t('billing.downgrade.scheduled.title')}
                  </div>
                  <div className="text-sm mt-1">
                    {t('billing.downgrade.scheduled.message', { plan: pendingDowngrade.subscriptionType })}
                    {pendingEffectiveAt ? (
                      <>{t('billing.downgrade.scheduled.date', { date: pendingEffectiveAt.toLocaleDateString() })}</>
                    ) : (
                      <>{t('billing.downgrade.scheduled.next_billing')}</>
                    )}
                    {t('billing.downgrade.scheduled.footer')}
                  </div>
                </div>
              )}
            </Card.Body>
            <Card.Footer>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('billing.payment.secure')}</span>
              <Button
                id="manage-plan-btn"
                className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-8"
                disabled={isSubmitting}
                onClick={toggleModal}
              >
                {t('billing.action.manage')}
              </Button>
            </Card.Footer>
          </Card>
        </div>
        <Modal
          show={showModal}
          title={t('billing.modal.upgrade.title')}
          toggle={toggleModal}
        >
          <div className="space-y-0 text-sm text-gray-600">
            <p>{t('billing.modal.upgrade.current', { plan: currentSubscription })}</p>
          </div>
          {pendingDowngrade && (
            <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
              <div className="text-sm font-bold">
                {t('billing.downgrade.scheduled.title')}
              </div>
              <div className="text-sm mt-1">
                {t('billing.downgrade.scheduled.message', { plan: pendingDowngrade.subscriptionType })}
                {pendingEffectiveAt ? (
                  <>{t('billing.downgrade.scheduled.date', { date: pendingEffectiveAt.toLocaleDateString() })}</>
                ) : (
                  <>{t('billing.downgrade.scheduled.next_billing')}</>
                )}
                {t('billing.downgrade.scheduled.footer')}
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button
              className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-6"
              disabled={isSubmitting}
              onClick={openBillingPortal}
            >
              {t('billing.action.portal')}
            </Button>
            {currentSubscription !== 'FREE' && (
              <button
                className="ml-4 text-sm text-red-600 hover:text-red-500 font-medium underline underline-offset-4"
                disabled={isSubmitting}
                onClick={handleCancelClick}
              >
                {t('billing.action.cancel')}
              </button>
            )}
          </div>
          <div className="flex space-x-5 h-full overflow-x-auto pb-4">
            {products.map((product, index) => (
              <Card key={index} className="min-w-[300px]">
                <Card.Body title={product.name} subtitle={product.description}>
                  <h3 className="text-4xl font-bold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: (product.prices.currency || 'USD').toUpperCase(),
                      maximumFractionDigits: 2,
                    }).format(Number(product.prices.unit_amount / 100))}
                    <span className="text-sm text-gray-400 font-medium ml-2">
                      / mo
                    </span>
                  </h3>
                  {product.prices.unit_amount_annual > 0 && (
                    <p className="mt-2 text-sm text-green-600 font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: (product.prices.currency || 'USD').toUpperCase(),
                        maximumFractionDigits: 2,
                      }).format(Number(product.prices.unit_amount_annual / 100))} / yr (Save 20%)
                    </p>
                  )}
                </Card.Body>
                <Card.Footer>
                  <div className="w-full flex space-x-2">
                    <Button
                      className={`flex-1 text-white ${!product.prices.id ? 'bg-zinc-400' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                      disabled={isSubmitting || !product.prices.id}
                      onClick={() => subscribe(product.prices.id)}
                    >
                      {isSubmitting
                        ? t('billing.action.subscribe.wait')
                        : product.prices.id
                          ? t('billing.action.subscribe.monthly')
                          : t('billing.action.subscribe.unavailable')}
                    </Button>
                    {product.prices.id_annual && (
                      <Button
                        className="flex-1 text-white bg-green-600 hover:bg-green-500"
                        disabled={isSubmitting}
                        onClick={() => subscribe(product.prices.id_annual)}
                      >
                        {t('billing.action.subscribe.annual')}
                      </Button>
                    )}
                  </div>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </Modal>

        <Modal
          show={showCancelModal}
          title={t('billing.modal.cancel.title')}
          toggle={() => setCancelModalVisibility(false)}
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-600 leading-relaxed font-executive">
              {t('billing.modal.cancel.message', { status: currentSubscription })}
            </p>

            {cancelPreview?.isAnnual && cancelPreview?.fee > 0 && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900">
                <div className="text-sm font-bold flex items-center">
                  <span className="mr-2">⚠️</span> {t('billing.modal.cancel.fee.title')}
                </div>
                <div className="text-sm mt-1">
                  {t('billing.modal.cancel.fee.description', { months: cancelPreview.remainingMonths, percentage: cancelPreview.feePercentage })}
                </div>
                <div className="mt-3 text-lg font-bold text-red-700">
                  {t('billing.modal.cancel.fee.amount', { amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: cancelPreview.currency }).format(cancelPreview.fee) })}
                </div>
                <p className="text-[10px] mt-2 text-red-600 uppercase tracking-widest font-bold">{t('billing.modal.cancel.fee.footer')}</p>
              </div>
            )}

            {!cancelPreview?.isAnnual && (
              <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic">
                {t('billing.modal.cancel.monthly.message')}
              </p>
            )}

            <p className="text-sm text-zinc-600 leading-relaxed font-executive">
              {t('billing.modal.cancel.confirm_message')}
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-3">
            <Button
              className="flex-1 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all font-bold py-3"
              disabled={isCancelling}
              onClick={confirmCancellation}
            >
              {isCancelling ? t('billing.action.processing') : t('billing.modal.cancel.action.confirm')}
            </Button>
            <Button
              className="px-6 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all font-bold py-3"
              disabled={isCancelling}
              onClick={() => setCancelModalVisibility(false)}
            >
              {t('billing.action.back')}
            </Button>
          </div>
        </Modal>
      </Content.Container>
      <div className="mt-16">
        <Content.Title
          title={t('billing.invoices.title')}
          subtitle={t('billing.invoices.subtitle')}
          className="font-executive"
        />
      </div>
      <Content.Divider />
      <div id="invoices-container">
        {isLoadingInvoices ? (
          <Content.Container>
            <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          </Content.Container>
        ) : invoices.length > 0 ? (
          <Content.Container>
            <div className="premium-card overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-100">
                <thead className="bg-zinc-50/50">
                  <tr className="text-left font-executive">
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{t('billing.invoices.table.number')}</th>
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{t('billing.invoices.table.date')}</th>
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{t('billing.invoices.table.status')}</th>
                    <th className="px-8 py-4 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {invoices.map((invoice, index) => (
                    <tr key={index} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <Link
                          href={invoice.hosted_invoice_url}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          target="_blank"
                        >
                          {invoice.number}
                        </Link>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {formatDistance(
                          new Date(invoice.created * 1000),
                          new Date(),
                          { addSuffix: true }
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Link
                          href={invoice.hosted_invoice_url}
                          className="text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all duration-300"
                          target="_blank"
                        >
                          <ChevronRightIcon className="w-5 h-5 inline-block group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Content.Container>
        ) : (
          <Content.Empty>
            {t('billing.invoices.empty')}
          </Content.Empty>
        )}
      </div>
    </AccountLayout>
  );
};

export const getStaticProps = async () => {
  try {
    const plans = await getAllPlans();
    const products = (plans || [])
      .filter((p) => p.isActive)
      .map((plan) => ({
        name: plan.name,
        description: plan.description,
        prices: {
          id: plan.stripePriceId,
          id_annual: plan.stripePriceIdAnnual,
          unit_amount: Number(plan.price) * 100,
          unit_amount_annual: (Number(plan.priceAnnual) || 0) * 100,
          currency: plan.currency,
          interval: plan.interval,
        },
      }));

    return {
      props: {
        products: products || [],
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Error fetching plans for billing:', error);
    return {
      props: {
        products: [],
      },
      revalidate: 60,
    };
  }
};

export default Billing;
