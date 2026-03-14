import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import Meta from '@/components/Meta/index';
import Button from '@/components/Button/index';

const WorkspacePaymentSettings = () => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const { data, error } = useSWR(session ? '/api/admin/finance/workspace-payment-settings' : null, fetcher);

  const isLoading = !data && !error;
  const workspaces = data?.data?.workspaces || [];
  const providers = data?.data?.providers;

  const providerOptions = useMemo(() => {
    return (Array.isArray(providers) ? providers : [])
      .slice()
      .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
      .map((p) => ({
        id: p.id,
        label: p.displayName,
        status: p.status,
        name: p.name,
      }));
  }, [providers]);

  const [editing, setEditing] = useState({});
  const [savingId, setSavingId] = useState(null);

  const initialRow = (workspace) => {
    const current = workspace.paymentSettings;
    return {
      providerId: current?.providerId || '',
      providerAccountId: current?.providerAccountId || '',
      platformFeePercentage: current?.platformFeePercentage == null ? '' : String(current.platformFeePercentage),
      platformFeeFixed: current?.platformFeeFixed == null ? '' : String(current.platformFeeFixed),
    };
  };

  const getRow = (workspace) => {
    const row = editing[workspace.id];
    if (row) return row;
    return initialRow(workspace);
  };

  const setRow = (workspace, patch) => {
    setEditing((prev) => ({
      ...prev,
      [workspace.id]: { ...getRow(workspace), ...patch },
    }));
  };

  const save = async (workspace) => {
    const row = getRow(workspace);
    if (!row.providerId) {
      toast.error('Selecione um provider');
      return;
    }
    setSavingId(workspace.id);
    try {
      const response = await api('/api/admin/finance/workspace-payment-settings', {
        method: 'PUT',
        body: {
          workspaceId: workspace.id,
          providerId: row.providerId,
          providerAccountId: row.providerAccountId || null,
          platformFeePercentage: row.platformFeePercentage,
          platformFeeFixed: row.platformFeeFixed,
        },
      });
      if (response?.error) {
        toast.error(response?.error?.msg || 'Falha ao salvar');
      } else {
        toast.success('Salvo');
        setEditing((prev) => {
          const next = { ...prev };
          delete next[workspace.id];
          return next;
        });
        mutate('/api/admin/finance/workspace-payment-settings');
      }
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <Meta title="Finance - Workspace Payment Settings" />
      <Content.Title title="Finance" subtitle="Workspace Payment Settings" className="font-executive" />
      <Content.Divider />

      <Content.Container>
        <Card>
          <Card.Body title="Provider por workspace" subtitle="Selecione o gateway e sobrescreva taxas se necessário">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workspace
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee fixo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : workspaces.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                        Nenhum workspace encontrado.
                      </td>
                    </tr>
                  ) : (
                    workspaces.map((w) => {
                      const row = getRow(w);
                      const disabled = savingId === w.id;
                      return (
                        <tr key={w.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">{w.name}</div>
                            <div className="text-xs text-gray-500">/{w.slug}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              className="rounded-md border border-gray-300 bg-white p-2 text-sm"
                              value={row.providerId}
                              onChange={(e) => setRow(w, { providerId: e.target.value })}
                              disabled={disabled}
                            >
                              <option value="">Selecione</option>
                              {providerOptions.map((p) => (
                                <option key={p.id} value={p.id} disabled={p.status !== 'active'}>
                                  {p.label} {p.status !== 'active' ? '(disabled)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              className="rounded-md border border-gray-300 p-2 text-sm w-56"
                              value={row.providerAccountId}
                              onChange={(e) => setRow(w, { providerAccountId: e.target.value })}
                              placeholder="Opcional"
                              disabled={disabled}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              className="rounded-md border border-gray-300 p-2 text-sm w-24"
                              value={row.platformFeePercentage}
                              onChange={(e) => setRow(w, { platformFeePercentage: e.target.value })}
                              placeholder="(global)"
                              disabled={disabled}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              className="rounded-md border border-gray-300 p-2 text-sm w-24"
                              value={row.platformFeeFixed}
                              onChange={(e) => setRow(w, { platformFeeFixed: e.target.value })}
                              placeholder="(global)"
                              disabled={disabled}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button
                              className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold"
                              onClick={() => save(w)}
                              disabled={disabled}
                            >
                              {disabled ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Content.Container>
    </AdminLayout>
  );
};

export default WorkspacePaymentSettings;
