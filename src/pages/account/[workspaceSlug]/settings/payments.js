import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';

const PaymentsSettings = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { workspaceSlug } = router.query;

  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/payment-settings` : null,
    api
  );

  const paymentSetting = data?.data?.paymentSetting || null;
  const providerName = paymentSetting?.provider?.name ? String(paymentSetting.provider.name).toLowerCase() : null;
  const providerLabel = paymentSetting?.provider?.displayName || (providerName ? providerName : '—');

  const [providerAccountId, setProviderAccountId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setWorkspace(workspace);
  }, [setWorkspace, workspace]);

  useEffect(() => {
    setProviderAccountId(paymentSetting?.providerAccountId || '');
  }, [paymentSetting?.providerAccountId]);

  const helperText = useMemo(() => {
    if (!providerName) return 'Este workspace ainda não tem um gateway definido pelo Super Admin.';
    if (providerName === 'asaas') return 'Asaas: informe o walletId da sua conta/subconta recebedora (split).';
    if (providerName === 'stripe') return 'Stripe: informe o ID da conta conectada (ex: acct_...).';
    if (providerName === 'mercadopago') return 'Mercado Pago: informe o collector_id (número) da conta recebedora.';
    if (providerName === 'pagarme') return 'Pagar.me: informe o recipient_id da conta recebedora.';
    return 'Informe o identificador da conta recebedora no gateway selecionado.';
  }, [providerName]);

  const save = async (e) => {
    e.preventDefault();
    if (!isTeamOwner) return;

    setIsSaving(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/payment-settings`, {
        method: 'PUT',
        body: { providerAccountId },
      });

      if (response?.error) {
        toast.error(response?.error?.msg || 'Falha ao salvar');
        return;
      }

      toast.success('Configuração salva');
      mutate();
    } catch {
      toast.error('Falha ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccountLayout>
      <Meta title={`Closify - ${workspace.name} | Pagamentos`} />
      <Content.Title
        title="Pagamentos"
        subtitle="Cadastre sua conta recebedora para receber repasses corretamente"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title="Conta recebedora" subtitle={`Gateway: ${providerLabel}`}>
            {!paymentSetting ? (
              <div className="text-sm text-gray-700">
                Este workspace ainda não tem gateway habilitado. Contate o suporte para ativar pagamentos.
              </div>
            ) : (
              <form onSubmit={save} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider Account ID</label>
                  <input
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                    value={providerAccountId}
                    onChange={(e) => setProviderAccountId(e.target.value)}
                    disabled={isSaving || !isTeamOwner}
                    placeholder="ex: walletId / acct_... / collector_id"
                  />
                  <div className="mt-2 text-xs text-gray-500">{helperText}</div>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold"
                    disabled={isSaving || !isTeamOwner}
                    type="submit"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            )}
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  let isTeamOwner = false;
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );
    if (workspace) {
      isTeamOwner = isWorkspaceOwner(session.user.email, workspace);
    }
  }

  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!workspace) {
    return { notFound: true };
  }

  return { props: { isTeamOwner, workspace } };
};

export default PaymentsSettings;
