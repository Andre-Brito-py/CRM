import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { DocumentDuplicateIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';

const formatMoney = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: String(currency || 'BRL').toUpperCase(), maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

const PaymentProducts = ({ isTeamOwner, workspace, platformFeePercentage }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { workspaceSlug } = router.query;

  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/payment-products` : null,
    api
  );

  const products = useMemo(() => data?.data?.products || [], [data]);

  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', price: '', imageUrl: '', active: true, isBookable: false, durationMinutes: 60, requiresPayment: false });

  useEffect(() => {
    setWorkspace(workspace);
  }, [setWorkspace, workspace]);

  useEffect(() => {
    setMounted(true);
    try {
      setOrigin(window.location.origin);
    } catch {
      setOrigin('');
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', price: '', imageUrl: '', active: true, isBookable: false, durationMinutes: 60, requiresPayment: false });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product?.name || '',
      slug: product?.slug || '',
      description: product?.description || '',
      price: product?.price != null ? String(product.price) : '',
      imageUrl: product?.imageUrl || '',
      active: Boolean(product?.active),
      isBookable: Boolean(product?.isBookable),
      durationMinutes: Number(product?.durationMinutes) || 60,
      requiresPayment: Boolean(product?.requiresPayment),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setEditing(null);
  };

  const linkFor = (product) => {
    const base = origin || '';
    return `${base}/p/${workspace.slug}/${product.slug}`;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!isTeamOwner) return;

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      price: form.price,
      imageUrl: form.imageUrl || null,
      active: form.active,
      isBookable: form.isBookable,
      durationMinutes: form.durationMinutes,
      requiresPayment: form.requiresPayment,
    };

    setIsSubmitting(true);
    try {
      if (editing?.id) {
        const response = await api(`/api/workspace/${workspaceSlug}/payment-products/${editing.id}`, {
          method: 'PUT',
          body: payload,
        });
        if (response.status >= 400 || response.error) {
          toast.error(response?.error?.msg || 'Falha ao salvar produto');
          return;
        }
        toast.success('Produto atualizado');
      } else {
        const response = await api(`/api/workspace/${workspaceSlug}/payment-products`, {
          method: 'POST',
          body: payload,
        });
        if (response.status >= 400 || response.error) {
          toast.error(response?.error?.msg || 'Falha ao criar produto');
          return;
        }
        toast.success('Produto criado');
      }

      setShowModal(false);
      setEditing(null);
      mutate();
    } catch {
      toast.error('Falha ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (product) => {
    if (!isTeamOwner) return;
    if (!confirm('Excluir este produto?')) return;

    setIsSubmitting(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/payment-products/${product.id}`, {
        method: 'DELETE',
      });
      if (response.status >= 400 || response.error) {
        toast.error(response?.error?.msg || 'Falha ao excluir produto');
        return;
      }
      toast.success('Produto excluído');
      mutate();
    } catch {
      toast.error('Falha ao excluir produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => toast.success('Copiado');

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace.name} | Produtos`} />
      <Content.Title title="Produtos" subtitle="Crie links fixos para cobrar clientes via WhatsApp" />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Produtos"
            subtitle="Cada produto gera um link fixo no formato /p/{workspace}/{produto}"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'}
              </div>
              {isTeamOwner ? (
                <Button className="text-white bg-brand-600 hover:bg-brand-700 flex items-center gap-2" onClick={openCreate}>
                  <PlusIcon className="w-4 h-4" />
                  <span>Novo produto</span>
                </Button>
              ) : null}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatMoney(p.price, p.currency)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={p.active ? 'text-green-700' : 'text-gray-500'}>
                          {p.active ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {mounted ? (
                          <div className="flex items-center gap-2">
                            <a className="text-brand-600 hover:underline" href={linkFor(p)} target="_blank" rel="noreferrer">
                              Abrir
                            </a>
                            <CopyToClipboard text={linkFor(p)} onCopy={copyToClipboard}>
                              <button type="button" className="text-gray-500 hover:text-brand-600" title="Copiar link">
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                            </CopyToClipboard>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                            onClick={() => openEdit(p)}
                            disabled={!isTeamOwner || isSubmitting}
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-red-700"
                            onClick={() => remove(p)}
                            disabled={!isTeamOwner || isSubmitting}
                            title="Excluir"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                        Nenhum produto cadastrado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>

        <Modal show={showModal} toggle={closeModal} title={editing ? 'Editar produto' : 'Novo produto'}>
          <form onSubmit={save} className="space-y-4 w-full max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                disabled={isSubmitting || !isTeamOwner}
                required
              />
            </div>
            {!editing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug (opcional)</label>
                <input
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                  value={form.slug}
                  onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                  disabled={isSubmitting || !isTeamOwner}
                  placeholder="ex: consulta-premium"
                />
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                disabled={isSubmitting || !isTeamOwner}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL da Imagem (opcional)</label>
              <div className="mt-1 flex gap-4 items-start">
                <input
                  className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                  value={form.imageUrl}
                  onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
                  disabled={isSubmitting || !isTeamOwner}
                  placeholder="https://exemplo.com/imagem.png"
                />
                {form.imageUrl && (
                  <div className="w-16 h-16 rounded-md border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Preço</label>
                <input
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                  value={form.price}
                  onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                  disabled={isSubmitting || !isTeamOwner}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Taxa da plataforma: {platformFeePercentage}% (o valor líquido será transferido para sua conta Stripe)
                </p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="productActive"
                  type="checkbox"
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  checked={Boolean(form.active)}
                  onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
                  disabled={isSubmitting || !isTeamOwner}
                />
                <label htmlFor="productActive" className="text-sm text-gray-700">Ativo</label>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  id="isBookable"
                  type="checkbox"
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  checked={Boolean(form.isBookable)}
                  onChange={(e) => setForm((s) => ({ ...s, isBookable: e.target.checked }))}
                  disabled={isSubmitting || !isTeamOwner}
                />
                <label htmlFor="isBookable" className="text-sm font-medium text-gray-700">Serviço Agendável (Autopilot)</label>
              </div>
              
              {form.isBookable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duração (minutos)</label>
                    <input
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                      value={form.durationMinutes}
                      onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))}
                      disabled={isSubmitting || !isTeamOwner}
                      type="number"
                      step="5"
                      min="5"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="requiresPayment"
                      type="checkbox"
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      checked={Boolean(form.requiresPayment)}
                      onChange={(e) => setForm((s) => ({ ...s, requiresPayment: e.target.checked }))}
                      disabled={isSubmitting || !isTeamOwner}
                    />
                    <label htmlFor="requiresPayment" className="text-sm text-gray-700">Exige pagamento ao agendar</label>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button className="bg-gray-100 hover:bg-gray-200" type="button" onClick={closeModal}>
                Cancelar
              </Button>
              <Button className="text-white bg-brand-600 hover:bg-brand-700" disabled={isSubmitting || !isTeamOwner}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Modal>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const { getServerSession } = await import('next-auth/next');
  const { getAuthOptions } = await import('@/lib/server/auth');
  const options = await getAuthOptions();
  const session = await getServerSession(context.req, context.res, options);
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

  if (!isTeamOwner) {
    return {
      redirect: {
        destination: `/account/${workspace.slug}`,
        permanent: false,
      },
    };
  }

  const { getPlatformFeeSettings } = await import('@/lib/server/payment-providers/resolver');
  let platformFeePercentage = 8; // fallback
  if (workspace) {
    const { percentage } = await getPlatformFeeSettings(workspace.id);
    platformFeePercentage = percentage;
  }

  return { props: { isTeamOwner, workspace, platformFeePercentage } };
};

export default PaymentProducts;
