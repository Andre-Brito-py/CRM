import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import Meta from '@/components/Meta/index';

const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

const CredentialsModal = ({ show, toggle, provider }) => {
  const { mutate } = useSWRConfig();
  const [environment, setEnvironment] = useState('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setEnvironment('sandbox');
    setApiKey('');
    setApiSecret('');
    setWebhookSecret('');
  };

  const onClose = () => {
    reset();
    toggle();
  };

  const save = async (e) => {
    e.preventDefault();
    if (!provider?.id) return;
    if (!apiKey.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api(`/api/admin/finance/payment-providers/${provider.id}/credentials`, {
        method: 'PUT',
        body: {
          environment,
          apiKey,
          apiSecret: apiSecret || null,
          webhookSecret: webhookSecret || null,
        },
      });
      if (response?.error) {
        toast.error(response?.error?.msg || 'Falha ao salvar credenciais');
      } else {
        toast.success('Credenciais salvas');
        mutate('/api/admin/finance/payment-providers');
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error('Falha ao salvar credenciais');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} toggle={onClose} title={`Configurar API — ${provider?.displayName || ''}`}>
      <form onSubmit={save} className="space-y-4 w-full max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700">Environment</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">API Secret</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Webhook Secret</label>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end space-x-3 mt-5">
          <Button
            type="button"
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" className="text-white bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const PaymentProviders = () => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const { data, error } = useSWR(session ? '/api/admin/finance/payment-providers' : null, fetcher);
  const { data: revenueSettings } = useSWR(session ? '/api/admin/finance/revenue-settings' : null, fetcher);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSavingFees, setIsSavingFees] = useState(false);
  const [platformFeePercentage, setPlatformFeePercentage] = useState('');
  const [platformFeeFixed, setPlatformFeeFixed] = useState('');

  const providers = data?.data?.providers || [];
  const isLoading = !data && !error;

  const feeValues = useMemo(() => {
    const p = revenueSettings?.data?.platformFeePercentage ?? '0';
    const f = revenueSettings?.data?.platformFeeFixed ?? '0';
    return { p: String(p), f: String(f) };
  }, [revenueSettings]);

  const openModal = (provider) => {
    setSelectedProvider(provider);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedProvider(null);
    setShowModal(false);
  };

  const toggleStatus = async (provider) => {
    const nextStatus = provider.status === 'active' ? 'disabled' : 'active';
    try {
      const response = await api(`/api/admin/finance/payment-providers/${provider.id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      if (response?.error) toast.error(response?.error?.msg || 'Falha ao atualizar provider');
      else mutate('/api/admin/finance/payment-providers');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao atualizar provider');
    }
  };

  const saveFees = async (e) => {
    e.preventDefault();
    setIsSavingFees(true);
    try {
      const response = await api('/api/admin/finance/revenue-settings', {
        method: 'PUT',
        body: {
          platformFeePercentage: platformFeePercentage || feeValues.p,
          platformFeeFixed: platformFeeFixed || feeValues.f,
        },
      });
      if (response?.error) toast.error(response?.error?.msg || 'Falha ao salvar taxas');
      else {
        toast.success('Taxas salvas');
        setPlatformFeePercentage('');
        setPlatformFeeFixed('');
        mutate('/api/admin/finance/revenue-settings');
      }
    } catch (error) {
      console.error(error);
      toast.error('Falha ao salvar taxas');
    } finally {
      setIsSavingFees(false);
    }
  };

  return (
    <AdminLayout>
      <Meta title="Finance - Payment Providers" />
      <Content.Title title="Finance" subtitle="Payment Providers" className="font-executive" />
      <Content.Divider />

      <Content.Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <Card.Body title="Gateways" subtitle="Habilite/desabilite e configure credenciais sem re-deploy">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credenciais</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                            Carregando...
                          </td>
                        </tr>
                      ) : providers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                            Nenhum provider encontrado.
                          </td>
                        </tr>
                      ) : (
                        providers.map((p) => (
                          <tr key={p.id}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-gray-900">{p.displayName}</div>
                              <div className="text-xs text-gray-500">{p.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                className={[
                                  'px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border',
                                  p.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200',
                                ].join(' ')}
                                onClick={() => toggleStatus(p)}
                              >
                                {p.status === 'active' ? 'Ativo' : 'Desativado'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div className="flex gap-2">
                                <span
                                  className={[
                                    'px-2 py-1 rounded-md text-xs font-semibold',
                                    p.credentials?.sandbox ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500',
                                  ].join(' ')}
                                >
                                  Sandbox
                                </span>
                                <span
                                  className={[
                                    'px-2 py-1 rounded-md text-xs font-semibold',
                                    p.credentials?.production ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500',
                                  ].join(' ')}
                                >
                                  Production
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button
                                className="text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-bold"
                                onClick={() => openModal(p)}
                              >
                                Configure API
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <Card.Body title="Platform Revenue Settings" subtitle="Taxas aplicadas automaticamente por transação">
                <form onSubmit={saveFees} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">platform_fee_percentage</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                      placeholder={feeValues.p}
                      value={platformFeePercentage}
                      onChange={(e) => setPlatformFeePercentage(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">platform_fee_fixed</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                      placeholder={feeValues.f}
                      value={platformFeeFixed}
                      onChange={(e) => setPlatformFeeFixed(e.target.value)}
                    />
                  </div>
                  <Button className="w-full text-white bg-blue-600 hover:bg-blue-700" disabled={isSavingFees}>
                    {isSavingFees ? 'Salvando...' : 'Salvar'}
                  </Button>
                </form>
                <div className="mt-4 text-xs text-gray-500">
                  Exemplo: 3 e 0.50 = {formatMoney(0.5)} + 3% por cobrança.
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Content.Container>

      <CredentialsModal show={showModal} toggle={closeModal} provider={selectedProvider} />
    </AdminLayout>
  );
};

export default PaymentProviders;

