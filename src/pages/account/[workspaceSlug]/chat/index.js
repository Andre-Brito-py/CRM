import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { UserCircleIcon, UsersIcon, LinkIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import useWorkspaces from '@/hooks/data/useWorkspaces';
import { getAuthOptions } from '@/lib/server/auth';

const formatTime = (iso) => {
  try {
    const d = iso ? new Date(String(iso)) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const pickOtherUser = ({ channel, currentUserId }) => {
  const a = channel?.userA || null;
  const b = channel?.userB || null;
  if (!a && !b) return null;
  if (a?.id && a.id !== currentUserId) return a;
  if (b?.id && b.id !== currentUserId) return b;
  return a || b;
};

const InternalChat = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const { setWorkspace } = useWorkspace();
  const { workspaceSlug } = router.query;
  const currentUserId = session?.user?.userId || session?.user?.id || '';
  const currentEmail = session?.user?.email || '';

  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [composer, setComposer] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const [showBridgesModal, setShowBridgesModal] = useState(false);
  const [bridgeOtherSlug, setBridgeOtherSlug] = useState('');
  const [bridgeName, setBridgeName] = useState('');
  const [isCreatingBridge, setIsCreatingBridge] = useState(false);

  useEffect(() => {
    setWorkspace(workspace);
  }, [setWorkspace, workspace]);

  const { data: channelsData, mutate: mutateChannels } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/internal-chat/channels` : null,
    api,
    { refreshInterval: 2500 }
  );

  const { data: membersData } = useSWR(
    workspaceSlug && showMembersModal ? `/api/workspace/${workspaceSlug}/internal-chat/members` : null,
    api
  );

  const { data: bridgesData, mutate: mutateBridges } = useSWR(
    workspaceSlug && showBridgesModal ? `/api/workspace/${workspaceSlug}/internal-chat/bridges` : null,
    api
  );

  const { workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  const channels = useMemo(() => {
    const team = channelsData?.data?.teamChannel ? [channelsData.data.teamChannel] : [];
    const dms = Array.isArray(channelsData?.data?.dmChannels) ? channelsData.data.dmChannels : [];
    return [...team, ...dms];
  }, [channelsData?.data?.dmChannels, channelsData?.data?.teamChannel]);

  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const selectedChannel = useMemo(() => {
    return channels.find((c) => c?.id === selectedChannelId) || null;
  }, [channels, selectedChannelId]);

  const selectedTitle = useMemo(() => {
    if (!selectedChannel) return 'Chat';
    if (selectedChannel.kind === 'TEAM') return 'Chat do time';
    const other = pickOtherUser({ channel: selectedChannel, currentUserId });
    return other?.name || other?.email || 'Conversa';
  }, [currentUserId, selectedChannel]);

  const { data: messagesData, mutate: mutateMessages, isValidating: isPollingMessages } = useSWR(
    workspaceSlug && selectedChannelId
      ? `/api/workspace/${workspaceSlug}/internal-chat/channels/${selectedChannelId}/messages?limit=200`
      : null,
    api,
    { refreshInterval: selectedChannelId ? 2000 : 0 }
  );

  const messages = useMemo(() => {
    return Array.isArray(messagesData?.data?.messages) ? messagesData.data.messages : [];
  }, [messagesData?.data?.messages]);

  const filteredMembers = useMemo(() => {
    const list = Array.isArray(membersData?.data?.members) ? membersData.data.members : [];
    const q = String(memberSearch || '').trim().toLowerCase();
    if (!q) return list.filter((m) => m?.id && m?.id !== currentUserId);
    return list
      .filter((m) => m?.id && m?.id !== currentUserId)
      .filter((m) => {
        const name = String(m?.name || '').toLowerCase();
        const email = String(m?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
  }, [currentUserId, memberSearch, membersData?.data?.members]);

  const ownedWorkspaceOptions = useMemo(() => {
    const list = Array.isArray(workspaces) ? workspaces : [];
    const normalized = list
      .filter((w) => w?.slug && w.slug !== workspaceSlug)
      .filter((w) => {
        const members = Array.isArray(w?.members) ? w.members : [];
        return members.some((m) => m?.member?.email === currentEmail && m?.teamRole === 'OWNER');
      })
      .map((w) => ({ slug: w.slug, name: w.name }));

    const unique = [];
    const seen = new Set();
    for (const ws of normalized) {
      if (seen.has(ws.slug)) continue;
      seen.add(ws.slug);
      unique.push(ws);
    }
    return unique;
  }, [currentEmail, workspaceSlug, workspaces]);

  const startDm = async (targetUserId) => {
    if (!workspaceSlug) return;
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/internal-chat/dm`, {
        method: 'POST',
        body: { targetUserId },
      });
      if (res?.error) {
        toast.error(res?.error?.msg || 'Falha ao iniciar conversa');
        return;
      }

      const channel = res?.data?.channel || null;
      if (channel?.id) {
        await mutateChannels();
        setSelectedChannelId(channel.id);
        setShowMembersModal(false);
        setMemberSearch('');
      }
    } catch {
      toast.error('Falha ao iniciar conversa');
    }
  };

  const send = async () => {
    if (!workspaceSlug) return;
    if (!selectedChannelId) return;
    const content = String(composer || '').trim();
    if (!content) return;

    setIsSending(true);
    try {
      const res = await api(
        `/api/workspace/${workspaceSlug}/internal-chat/channels/${selectedChannelId}/messages`,
        { method: 'POST', body: { content } }
      );
      if (res?.error) {
        toast.error(res?.error?.msg || 'Falha ao enviar');
        return;
      }

      setComposer('');
      mutateMessages();
      mutateChannels();
    } catch {
      toast.error('Falha ao enviar');
    } finally {
      setIsSending(false);
    }
  };

  const createBridge = async (e) => {
    e.preventDefault();
    if (!workspaceSlug) return;
    if (!bridgeOtherSlug) return;

    setIsCreatingBridge(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/internal-chat/bridges`, {
        method: 'POST',
        body: { otherWorkspaceSlug: bridgeOtherSlug, name: bridgeName || undefined },
      });

      if (res?.error) {
        toast.error(res?.error?.msg || 'Falha ao conectar');
        return;
      }

      toast.success(res?.data?.alreadyExists ? 'Conexão já existia' : 'Conexão criada');
      setBridgeOtherSlug('');
      setBridgeName('');
      mutateBridges();
    } catch {
      toast.error('Falha ao conectar');
    } finally {
      setIsCreatingBridge(false);
    }
  };

  const deleteBridge = async (bridgeId) => {
    if (!workspaceSlug) return;
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/internal-chat/bridges/${bridgeId}`, {
        method: 'DELETE',
      });
      if (res?.error) {
        toast.error(res?.error?.msg || 'Falha ao remover');
        return;
      }
      toast.success('Conexão removida');
      mutateBridges();
    } catch {
      toast.error('Falha ao remover');
    }
  };

  const bridges = useMemo(() => {
    return Array.isArray(bridgesData?.data?.bridges) ? bridgesData.data.bridges : [];
  }, [bridgesData?.data?.bridges]);

  return (
    <AccountLayout>
      <Meta title={`Closify - ${workspace.name} | Chat`} />
      <Content.Title title="Chat Interno" subtitle="Converse com a equipe sem sair do Closify" />
      <Content.Divider />
      <Content.Container>
        <Card>
          <div className="flex flex-col md:flex-row h-[70vh] min-h-[540px]">
            <div className="w-full md:w-[360px] lg:w-[420px] border-b md:border-b-0 md:border-r border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-800">Conversas</div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    onClick={() => setShowMembersModal(true)}
                    className="px-3 py-2 text-xs rounded-xl"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Nova</span>
                  </Button>
                  {isTeamOwner && (
                    <Button
                      onClick={() => setShowBridgesModal(true)}
                      className="px-3 py-2 text-xs rounded-xl"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Conexões</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto h-full">
                {channels.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Nenhuma conversa</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {channels.map((c) => {
                      const isActive = c.id === selectedChannelId;
                      const isTeam = c.kind === 'TEAM';
                      const other = isTeam ? null : pickOtherUser({ channel: c, currentUserId });
                      const title = isTeam ? 'Chat do time' : other?.name || other?.email || 'Conversa';
                      const subtitle = c?.lastMessage?.content ? String(c.lastMessage.content) : '';

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChannelId(c.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${isActive ? 'bg-indigo-50' : 'bg-white'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {isTeam ? (
                                <UsersIcon className="w-8 h-8 text-indigo-500" />
                              ) : other?.image ? (
                                <img src={other.image} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {subtitle || (isTeam ? 'Mensagens da equipe' : 'Conversa direta')}
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {c?.lastMessage?.createdAt ? formatTime(c.lastMessage.createdAt) : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{selectedTitle}</div>
                  <div className="text-xs text-gray-500">
                    {selectedChannel?.kind === 'TEAM' ? 'Equipe do workspace' : 'Mensagem privada'}
                    {isPollingMessages ? ' • Atualizando...' : ''}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-500">Sem mensagens ainda</div>
                ) : (
                  messages.map((m) => {
                    const mine = m?.authorId === currentUserId;
                    const showAuthor = selectedChannel?.kind === 'TEAM' && !mine;
                    const authorLabel = m?.author?.name || m?.author?.email || '';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${mine ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'
                            }`}
                        >
                          {showAuthor && (
                            <div className={`text-[10px] font-semibold ${mine ? 'text-indigo-100' : 'text-gray-500'}`}>
                              {authorLabel}
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap break-words">{String(m?.content || '')}</div>
                          <div className={`text-[10px] mt-1 ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                            {m?.createdAt ? formatTime(m.createdAt) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <input
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isSending) send();
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button disabled={!composer.trim() || isSending} onClick={send}>
                    {isSending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Content.Container>

      <Modal
        show={showMembersModal}
        title="Nova conversa"
        toggle={() => setShowMembersModal(false)}
      >
        <div className="space-y-4">
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Nenhum usuário encontrado</div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => startDm(m.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                >
                  {m?.image ? (
                    <img src={m.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800 truncate">{m?.name || m?.email}</div>
                    <div className="text-xs text-gray-500 truncate">{m?.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal
        show={showBridgesModal}
        title="Conexões de chat do time"
        toggle={() => setShowBridgesModal(false)}
      >
        <div className="space-y-5">
          <div className="text-sm text-gray-600">
            Conecte chats do time entre workspaces (somente owners). Mensagens do Chat do time serão replicadas.
          </div>

          <form onSubmit={createBridge} className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Workspace para conectar</div>
              {isLoadingWorkspaces ? (
                <div className="text-sm text-gray-500">Carregando...</div>
              ) : ownedWorkspaceOptions.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum outro workspace em que você seja owner</div>
              ) : (
                <select
                  value={bridgeOtherSlug}
                  onChange={(e) => setBridgeOtherSlug(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {ownedWorkspaceOptions.map((ws) => (
                    <option key={ws.slug} value={ws.slug}>
                      {ws.name} ({ws.slug})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Nome da conexão (opcional)</div>
              <input
                value={bridgeName}
                onChange={(e) => setBridgeName(e.target.value)}
                placeholder="Ex: Operação + Suporte"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <Button disabled={!bridgeOtherSlug || isCreatingBridge} type="submit">
                <LinkIcon className="w-4 h-4" />
                <span>{isCreatingBridge ? 'Conectando...' : 'Conectar'}</span>
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-700">Conexões atuais</div>
            {bridges.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma conexão</div>
            ) : (
              <div className="space-y-2">
                {bridges.map((b) => (
                  <div key={b.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{b.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Array.isArray(b.workspaces) ? b.workspaces.map((w) => w?.name || w?.slug).filter(Boolean).join(' • ') : ''}
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteBridge(b.id)}
                      className="px-3 py-2 text-xs rounded-xl"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Remover</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, await getAuthOptions());
  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const workspace = await getWorkspace(
    session.user.userId || session.user.id,
    session.user.email,
    context.params.workspaceSlug
  );

  if (!workspace) {
    return { notFound: true };
  }

  const isTeamOwner = isWorkspaceOwner(session.user.email, workspace);

  return {
    props: {
      session,
      isTeamOwner,
      workspace,
    },
  };
};

export default InternalChat;
