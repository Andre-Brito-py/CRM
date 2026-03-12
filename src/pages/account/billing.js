import { useState } from 'react';
import formatDistance from 'date-fns/formatDistance';
import Link from 'next/link';
import { getSession, useSession } from 'next-auth/react';
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

const Billing = ({ invoices, products }) => {
  const { data: session } = useSession();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [showModal, setModalVisibility] = useState(false);

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
        (async () => redirectToCheckout(response.data.sessionId))();
      }
    });
  };

  const toggleModal = () => setModalVisibility(!showModal);
  const currentSubscription = session?.user?.subscription || 'FREE';

  return (
    <AccountLayout>
      <Meta title="Nextacular - Billing" />
      <Content.Title
        title="Billing & Subscription"
        subtitle="Manage your professional plan and invoicing"
        className="font-executive"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Premium Subscription"
            subtitle={`Current status: ${currentSubscription}`}
          >
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              <p className="text-sm">
                Professional and Enterprise accounts unlock the full power of Nextacular.
                Manage unlimited contacts, advanced pipelines, and team collaboration
                with our executive suite.
              </p>
            </div>
          </Card.Body>
          <Card.Footer>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Secure Stripe Payment</span>
            <Button
              className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-8"
              disabled={isSubmitting}
              onClick={toggleModal}
            >
              Manage Plan
            </Button>
          </Card.Footer>
        </Card>
        <Modal
          show={showModal}
          title="Upgrade Subscription"
          toggle={toggleModal}
        >
          <div className="space-y-0 text-sm text-gray-600">
            <p>You are currently under the {currentSubscription} plan</p>
          </div>
          <div className="mt-4">
            <Button
              className="text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all font-bold px-6"
              disabled={isSubmitting}
              onClick={openBillingPortal}
            >
              Open Billing Portal
            </Button>
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
                      / {product.prices.interval}
                    </span>
                  </h3>
                </Card.Body>
                <Card.Footer>
                  <Button
                    className="w-full text-white bg-blue-600 hover:bg-blue-500"
                    disabled={isSubmitting || !product.prices.id}
                    onClick={() => subscribe(product.prices.id)}
                  >
                    {isSubmitting
                      ? 'Redirecting...'
                      : product.prices.id
                        ? `Upgrade to ${product.name}`
                        : 'Unavailable'}
                  </Button>
                </Card.Footer>
              </Card>
            ))}
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
          Once you&apos;ve paid for something on Nextacular, invoices will show
          up here
        </Content.Empty>
      )}
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || !session.user?.email) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  // Se não tiver chave do Stripe configurada, retornar props vazias para evitar erro
  if (!process.env.PAYMENTS_SECRET_KEY) {
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

    const products = (plans || []).map((plan) => ({
      name: plan.name,
      description: plan.description,
      prices: {
        id: plan.stripePriceId,
        unit_amount: Number(plan.price) * 100,
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
