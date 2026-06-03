import { useMemo, useState } from 'react';
import Meta from '@/components/Meta/index';
import api from '@/lib/common/api';
import prisma from '@/prisma/index';

const formatMoney = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: String(currency || 'BRL').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const PublicProductPayment = ({ workspaceSlug, workspaceName, product, status }) => {
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [billingType, setBillingType] = useState('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const title = useMemo(() => {
    const base = product?.name ? `${product.name} — Pagamento` : 'Pagamento';
    return workspaceName ? `${base} | ${workspaceName}` : base;
  }, [product?.name, workspaceName]);

  const onPay = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api(`/api/public/payment-products/${workspaceSlug}/${product.slug}/checkout`, {
        method: 'POST',
        body: {
          name: payerName,
          email: payerEmail || undefined,
          phone: payerPhone || undefined,
          billingType,
        },
      });

      if (response.status >= 400 || response.error) {
        setError(response?.error?.msg || 'Falha ao iniciar pagamento');
        setIsSubmitting(false);
        return;
      }

      const link = response?.data?.paymentLink;
      if (link) {
        window.location.href = link;
        return;
      }

      setError('Link de pagamento não disponível');
    } catch {
      setError('Falha ao iniciar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <Meta title="Link inválido" />
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
          <div className="text-lg font-semibold text-zinc-900">Link inválido</div>
          <div className="mt-2 text-sm text-zinc-600">
            Este produto não existe ou não está disponível.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <Meta title={title} />
      <div className="max-w-xl mx-auto">
        {product.imageUrl && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-[200px] aspect-square rounded-2xl border border-zinc-200 shadow-sm overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div className="text-center">
          <div className="text-xs font-semibold tracking-wide uppercase text-zinc-500">
            {workspaceName || 'Pagamento'}
          </div>
          <h1 className="mt-2 text-3xl font-executive font-bold text-zinc-900">
            {product.name}
          </h1>
          {product.description ? (
            <p className="mt-3 text-zinc-600">
              {product.description}
            </p>
          ) : null}
          <div className="mt-4 text-2xl font-semibold text-zinc-900">
            {formatMoney(product.price, product.currency)}
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            {status === 'success' ? (
              <div className="text-green-700">Pagamento concluído com sucesso.</div>
            ) : status === 'cancelled' ? (
              <div className="text-amber-700">Pagamento cancelado.</div>
            ) : (
              <div className="text-zinc-700">Status: {status}</div>
            )}
          </div>
        ) : null}

        <div className="mt-6 bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
          <form onSubmit={onPay} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Seu nome</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Email (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={payerEmail}
                  onChange={(e) => setPayerEmail(e.target.value)}
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">WhatsApp/Telefone (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Forma de pagamento</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={billingType}
                onChange={(e) => setBillingType(e.target.value)}
              >
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="CREDIT_CARD">Cartão</option>
              </select>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !payerName.trim()}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Iniciando...' : 'Pagar agora'}
            </button>
          </form>
        </div>
        <div className="mt-6 text-center text-xs text-zinc-500">
          Este link foi gerado por {workspaceName || 'um vendedor'}.
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context) => {
  const { workspaceSlug, productSlug } = context.params || {};
  const status = context.query?.status ? String(context.query.status) : null;

  const workspace = await prisma.workspace.findFirst({
    where: { slug: String(workspaceSlug || '') },
    select: { id: true, slug: true, name: true },
  });

  if (!workspace) return { notFound: true };

  const product = await prisma.paymentProduct.findFirst({
    where: {
      workspaceId: workspace.id,
      slug: String(productSlug || ''),
      deletedAt: null,
      active: true,
    },
  });

  if (!product) return { notFound: true };

  return {
    props: {
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      product: JSON.parse(JSON.stringify(product)),
      status,
    },
  };
};

export default PublicProductPayment;

