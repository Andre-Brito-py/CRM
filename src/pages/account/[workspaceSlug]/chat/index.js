import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserCircleIcon, UsersIcon, LinkIcon, TrashIcon, PlusIcon, PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
// Remove or carefully override standard Card for glassmorphism
// import Card from '@/components/Card/index'; 
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

  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <Meta title={`Vysify - ${workspace.name} | Chat`} />
      
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Chat Interno</h1>
        <p className="text-gray-500 dark:text-zinc-400">Comunicação em tempo real para a sua equipe crescer mais rápido</p>
      </div>

      <div className="relative group p-[2px] rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 shadow-2xl overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex flex-col md:flex-row h-[75vh] min-h-[600px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[calc(1.5rem-1px)] border border-white/40 dark:border-zinc-800/40 relative z-10">
          
          {/* Sidebar */}
          <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col border-b md:border-b-0 md:border-r border-gray-100 dark:border-zinc-800/50">
            <div className="p-5 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Conversas</h3>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMembersModal(true)}
                  className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                </motion.button>
                {isTeamOwner && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBridgesModal(true)}
                    className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-100 transition-colors"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
              {channels.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-gray-500">Nenhuma conversa ativa</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {channels.map((c) => {
                    const isActive = c.id === selectedChannelId;
                    const isTeam = c.kind === 'TEAM';
                    const other = isTeam ? null : pickOtherUser({ channel: c, currentUserId });
                    const title = isTeam ? 'Chat do time' : other?.name || other?.email || 'Conversa';
                    const subtitle = c?.lastMessage?.content ? String(c.lastMessage.content) : '';

                    return (
                      <motion.button
                        key={c.id}
                        initial={false}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedChannelId(c.id)}
                        className={`w-full group rounded-2xl flex items-center gap-4 p-4 transition-all duration-300 relative ${
                          isActive 
                            ? 'bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 shadow-sm' 
                            : 'hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 border border-transparent'
                        }`}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="active-pill"
                            className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full"
                          />
                        )}
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border-2 shadow-sm transition-colors ${
                             isActive ? 'border-indigo-200 dark:border-indigo-800' : 'border-gray-100 dark:border-zinc-800'
                          }`}>
                            {isTeam ? (
                              <UsersIcon className="w-6 h-6 text-indigo-500" />
                            ) : other?.image ? (
                              <img src={other.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircleIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          {isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className={`text-sm font-bold truncate ${isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-zinc-100'}`}>
                            {title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                            {subtitle || (isTeam ? 'Mensagens da equipe' : 'Conversa direta')}
                          </div>
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                          {c?.lastMessage?.createdAt ? formatTime(c.lastMessage.createdAt) : ''}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white/20 dark:bg-zinc-900/10 h-full relative">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                  {selectedChannel?.kind === 'TEAM' ? <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <UserCircleIcon className="w-6 h-6 text-gray-500" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedTitle}</h2>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500 dark:text-indigo-400 mt-0.5">
                    {selectedChannel?.kind === 'TEAM' ? 'Canal Geral do Time' : 'Mensagem Privada'}
                    {isPollingMessages && <span className="ml-2 lowercase font-normal italic opacity-60">• sincronizando...</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center px-10"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                      <PlusIcon className="w-10 h-10 text-indigo-300 dark:text-indigo-800" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">Nenhuma mensagem neste canal ainda. Comece a conversa!</p>
                  </motion.div>
                ) : (
                  messages.map((m, idx) => {
                    const mine = m?.authorId === currentUserId;
                    const showAuthor = selectedChannel?.kind === 'TEAM' && !mine;
                    const authorLabel = m?.author?.name || m?.author?.email || '';
                    const prevMine = messages[idx-1]?.authorId === currentUserId;
                    const nextMine = messages[idx+1]?.authorId === currentUserId;

                    return (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%]`}>
                          {showAuthor && (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 ml-3 mb-0.5 uppercase tracking-wide">
                              {authorLabel}
                            </span>
                          )}
                          <div className="relative">
                            <div
                              className={`px-5 py-3 shadow-sm transition-all duration-200 ${
                                mine 
                                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-200/50 dark:shadow-none font-medium' 
                                  : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-zinc-700/50'
                              } group-hover:shadow-md`}
                            >
                              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{String(m?.content || '')}</div>
                            </div>
                            <div className={`absolute -bottom-5 ${mine ? 'right-1' : 'left-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                               <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase">
                                 {m?.createdAt ? formatTime(m.createdAt) : ''}
                               </span>
                            </div>
                          </div>
                          {!mine && idx < messages.length - 1 && !nextMine && idx === messages.length -1 && (
                            <div className={`text-[9px] mt-4 font-bold text-gray-400 dark:text-zinc-600 ${mine ? 'text-right' : 'text-left'}`}>
                              {m?.createdAt ? formatTime(m.createdAt) : ''}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} className="h-4" />
              </AnimatePresence>
            </div>

            <div className="p-6 bg-gradient-to-t from-white via-white/80 dark:from-zinc-900 dark:via-zinc-900/80 backdrop-blur-md">
              <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-gray-100/50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSending) send();
                    }
                  }}
                  placeholder="Escreva sua mensagem..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2.5 text-sm dark:text-zinc-100 placeholder-zinc-500"
                />
                <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   disabled={!composer.trim() || isSending}
                   onClick={send}
                   className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Accents */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>

      {/* Modals remain mostly functional but with slightly improved styling inside */}
      <Modal
        show={showMembersModal}
        title="Iniciar Nova Conversa"
        toggle={() => setShowMembersModal(false)}
      >
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar colega de equipe..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-500">Ninguém encontrado</p>
              </div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => startDm(m.id)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-2xl flex items-center gap-4 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-zinc-600">
                    {m?.image ? (
                      <img src={m.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">{m?.name || m?.email}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-tight">{m?.email}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlusIcon className="w-4 h-4 text-indigo-600" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal
        show={showBridgesModal}
        title="Bridges (Conexões Inter-Workspace)"
        toggle={() => setShowBridgesModal(false)}
      >
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            As conexões permitem que mensagens do <strong>Canal Geral</strong> sejam replicadas entre workspaces diferentes que você gerencia. Ideal para integrar operações.
          </div>

          <form onSubmit={createBridge} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider ml-1">Workspace Destino</label>
              {isLoadingWorkspaces ? (
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ) : ownedWorkspaceOptions.length === 0 ? (
                <div className="text-xs italic text-gray-500">Nenhum outro workspace detectado</div>
              ) : (
                <select
                  value={bridgeOtherSlug}
                  onChange={(e) => setBridgeOtherSlug(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm"
                >
                  <option value="">Selecione um destino...</option>
                  {ownedWorkspaceOptions.map((ws) => (
                    <option key={ws.slug} value={ws.slug}>{ws.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider ml-1">Alias da Conexão</label>
              <input
                value={bridgeName}
                onChange={(e) => setBridgeName(e.target.value)}
                placeholder="Ex: Operação Global"
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm"
              />
            </div>

            <Button disabled={!bridgeOtherSlug || isCreatingBridge} type="submit" full>
              {isCreatingBridge ? 'Estabelecendo Bridge...' : 'Ligar Workspaces'}
            </Button>
          </form>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-widest">Ativas</h4>
            {bridges.length === 0 ? (
              <p className="text-xs italic text-gray-500">Nenhuma ponte ativa</p>
            ) : (
              <div className="space-y-2">
                {bridges.map((b) => (
                  <div key={b.id} className="group p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{b.name}</div>
                      <div className="text-[10px] text-gray-500 opacity-60">ID: {b.id.slice(-8)}</div>
                    </div>
                    <button
                      onClick={() => deleteBridge(b.id)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <TrashIcon className="w-4.5 h-4.5" />
                    </button>
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
