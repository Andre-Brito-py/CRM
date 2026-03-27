import { useEffect, useState } from 'react';
import formatDistance from 'date-fns/formatDistance';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
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
import { getInvoices } from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import { getAllPlans } from '@/prisma/services/plan';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import { authOptions, getAuthOptions } from '@/lib/server/auth';

const Billing = ({ invoices, products }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [showModal, setModalVisibility] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showCancelModal, setCancelModalVisibility] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

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
  const currentSubscription = session?.user?.subscription || 'FREE';

  useEffect(() => {
    let mounted = true;
    api('/api/payments/subscription/status', { method: 'GET' })
      .then((response) => {
        if (!mounted) return;
        if (response?.data) setSubscriptionStatus(response.data);
      })
      .catch(() => { });

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
      <Meta title="Vysify - Billing" />
      <Content.Title
        title="Billing & Subscription"
        subtitle="Manage your professional plan and invoicing"
        className="font-executive"
      />
      <Content.Divider />
      <Content.Container>
        <div id="subscription-card">
          <Card>
            <Card.Body
              title="Premium Subscription"
              subtitle={`Current status: ${currentSubscription}`}
            >
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                <p className="text-sm">
                  Professional and Enterprise accounts unlock the full power of Vysify.
                  Manage unlimited contacts, advanced pipelines, and team collaboration
                  with our executive suite.
                </p>
              </div>
              {pendingDowngrade && (
                <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                  <div className="text-sm font-bold">
                    Mudança de plano agendada
                  </div>
                  <div className="text-sm mt-1">
                    Seu plano será alterado para <span className="font-bold">{pendingDowngrade.subscriptionType}</span>
                    {pendingEffectiveAt ? (
                      <> em <span className="font-bold">{pendingEffectiveAt.toLocaleDateString()}</span></>
                    ) : (
                      <> na próxima cobrança</>
                    )}
                    . Até lá, você mantém os recursos do seu plano atual.
                  </div>
                </div>
              )}
            </Card.Body>
            <Card.Footer>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Secure Stripe Payment</span>
              <Button
                id="manage-plan-btn"
                className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-8"
                disabled={isSubmitting}
                onClick={toggleModal}
              >
                Manage Plan
              </Button>
            </Card.Footer>
          </Card>
        </div>
        <Modal
          show={showModal}
          title="Upgrade Subscription"
          toggle={toggleModal}
        >
          <div className="space-y-0 text-sm text-gray-600">
            <p>You are currently under the {currentSubscription} plan</p>
          </div>
          {pendingDowngrade && (
            <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
              <div className="text-sm font-bold">
                Downgrade já agendado
              </div>
              <div className="text-sm mt-1">
                O plano muda para <span className="font-bold">{pendingDowngrade.subscriptionType}</span>
                {pendingEffectiveAt ? (
                  <> em <span className="font-bold">{pendingEffectiveAt.toLocaleDateString()}</span></>
                ) : (
                  <> na próxima cobrança</>
                )}
                . Até lá, você mantém os recursos do plano atual.
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button
              className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-6"
              disabled={isSubmitting}
              onClick={openBillingPortal}
            >
              Open Billing Portal
            </Button>
            {currentSubscription !== 'FREE' && (
              <button
                className="ml-4 text-sm text-red-600 hover:text-red-500 font-medium underline underline-offset-4"
                disabled={isSubmitting}
                onClick={handleCancelClick}
              >
                Cancelar Assinatura
              </button>
            )}
          </div>
          <div className="flex space-x-5">
            {products.map((product, index) => (
              <Card key={index}>
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
                      className={`flex-1 text-white ${!product.prices.id ? 'bg-zinc-400' : 'bg-brand-600 hover:bg-brand-500'}`}
                      disabled={isSubmitting || !product.prices.id}
                      onClick={() => subscribe(product.prices.id)}
                    >
                      {isSubmitting
                        ? 'Wait...'
                        : product.prices.id
                          ? `Assinar Mensal`
                          : 'Indisponível'}
                    </Button>
                    {product.prices.id_annual && (
                      <Button
                        className="flex-1 text-white bg-green-600 hover:bg-green-500"
                        disabled={isSubmitting}
                        onClick={() => subscribe(product.prices.id_annual)}
                      >
                        Assinar Anual
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
          title="Confirmar Cancelamento"
          toggle={() => setCancelModalVisibility(false)}
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-600 leading-relaxed font-executive">
              Você está prestes a cancelar sua assinatura <strong>{currentSubscription}</strong>.
            </p>

            {cancelPreview?.isAnnual && cancelPreview?.fee > 0 && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900">
                <div className="text-sm font-bold flex items-center">
                  <span className="mr-2">⚠️</span> Taxa de Cancelamento Antecipado
                </div>
                <div className="text-sm mt-1">
                  Como você possui um plano anual com {cancelPreview.remainingMonths} meses restantes,
                  será aplicada uma multa de <strong>{cancelPreview.feePercentage}%</strong> sobre o valor mensal equivalente.
                </div>
                <div className="mt-3 text-lg font-bold text-red-700">
                  Valor da Taxa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cancelPreview.currency }).format(cancelPreview.fee)}
                </div>
                <p className="text-[10px] mt-2 text-red-600 uppercase tracking-widest font-bold">Cobrança única via Stripe</p>
              </div>
            )}

            {!cancelPreview?.isAnnual && (
              <p className="text-sm text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic">
                Sua assinatura mensal será encerrada ao final do período atual.
              </p>
            )}

            <p className="text-sm text-zinc-600 leading-relaxed font-executive">
              Deseja realmente prosseguir? Esta ação não pode ser desfeita e você perderá acesso aos recursos premium imediatamente após o processamento.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-3">
            <Button
              className="flex-1 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all font-bold py-3"
              disabled={isCancelling}
              onClick={confirmCancellation}
            >
              {isCancelling ? 'Processando...' : 'Confirmar e Cancelar'}
            </Button>
            <Button
              className="px-6 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all font-bold py-3"
              disabled={isCancelling}
              onClick={() => setCancelModalVisibility(false)}
            >
              Voltar
            </Button>
          </div>
        </Modal>
      </Content.Container>
      <div className="mt-16">
        <Content.Title
          title="Invoices"
          subtitle="Reference your past transactions"
          className="font-executive"
        />
      </div>
      <Content.Divider />
      <div id="invoices-container">
        {invoices.length > 0 ? (
          <Content.Container>
            <div className="premium-card overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-100">
                <thead className="bg-zinc-50/50">
                  <tr className="text-left font-executive">
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Invoice Number</th>
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
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
            Once you&apos;ve paid for something on Vysify, invoices will show
            up here
          </Content.Empty>
        )}
      </div>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const options = await getAuthOptions();
  const session = await getServerSession(context.req, context.res, options);

  if (!session || !session.user?.email) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  // Se não tiver chave do Stripe configurada, retornar props vazias para evitar erro
  const { getSystemConfig } = await import('@/lib/server/config');
  const stripeKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
  if (!stripeKey) {
    return {
      props: {
        invoices: [],
        products: [],
      },
    };
  }

  try {
    const customerPayment = await getPayment(session.user.email);
    const [invoices, plans] = await Promise.all([
      getInvoices(customerPayment?.paymentId),
      getAllPlans(),
    ]);

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
        invoices: invoices || [],
        products: products || [],
      },
    };
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return {
      props: {
        invoices: [],
        products: [],
      },
    };
  }
};

export default Billing;
