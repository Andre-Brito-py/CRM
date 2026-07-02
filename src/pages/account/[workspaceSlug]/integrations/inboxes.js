import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { 
  EnvelopeIcon, 
  TrashIcon, 
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

export default function EmailInboxes() {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/inboxes` : null,
    fetcher
  );

  const inboxes = data?.data || [];
  const isLoading = !data;

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [dailyLimit, setDailyLimit] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DNS Checker State
  const [checkingDns, setCheckingDns] = useState(null); // id of inbox currently checking
  const [dnsResults, setDnsResults] = useState({});

  const handleAddInbox = async (e) => {
    e.preventDefault();
    if (!email || !host || !user || !pass) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = {
        host,
        port: Number(port),
        secure,
        user,
        pass,
        from: email
      };

      await api(`/api/workspace/${workspaceSlug}/integrations/inboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          provider: 'SMTP',
          credentials,
          dailyLimit: Number(dailyLimit)
        })
      });

      toast.success('Caixa de e-mail conectada com sucesso!');
      setShowAddForm(false);
      setEmail('');
      setHost('');
      setPort('587');
      setSecure(false);
      setUser('');
      setPass('');
      setDailyLimit('50');
      mutate();
    } catch (error) {
      toast.error(error.message || 'Falha ao conectar caixa de e-mail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInbox = async (id) => {
    if (!confirm('Deseja realmente remover esta caixa de e-mail?')) return;
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/inboxes?id=${id}`, {
        method: 'DELETE'
      });
      toast.success('Caixa de e-mail removida.');
      mutate();
    } catch (error) {
      toast.error('Falha ao remover caixa de e-mail.');
    }
  };

  const handleToggleInbox = async (id, currentActive) => {
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/inboxes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive })
      });
      toast.success('Status da caixa atualizado.');
      mutate();
    } catch (error) {
      toast.error('Falha ao atualizar status.');
    }
  };

  const handleCheckDns = async (inbox) => {
    const domain = inbox.email.split('@')[1];
    if (!domain) return;

    setCheckingDns(inbox.id);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/check-dns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });

      setDnsResults(prev => ({
        ...prev,
        [inbox.id]: res.data
      }));
      toast.success(`Registros DNS verificados para ${domain}`);
    } catch (error) {
      toast.error('Erro ao verificar registros DNS.');
    } finally {
      setCheckingDns(null);
    }
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center h-screen bg-[#09090b]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Carregando...</span>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="py-12 bg-[#09090b] text-zinc-100 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-[14px] flex items-center justify-center border border-indigo-500/20">
                <EnvelopeIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Rotação de E-mails</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tighter leading-none mb-3">
              Múltiplos Remetentes (Inbox Rotation)
            </h1>
            <p className="text-zinc-400 font-medium text-lg max-w-2xl leading-relaxed">
              Rotacione múltiplos SMTPs e monitore a integridade de seus domínios para maximizar a entregabilidade dos seus Cold Emails.
            </p>
          </div>
          <div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 rounded-[16px] text-xs font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/15 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              {showAddForm ? 'Cancelar' : 'Adicionar Caixa SMTP'}
            </motion.button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <AnimatePresence>
            {showAddForm && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-8 mb-10"
              >
                <h3 className="text-xl font-bold text-white mb-6">Nova Conexão SMTP</h3>
                <form onSubmit={handleAddInbox} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">E-mail Remetente</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: lucas@vysify.com" 
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SMTP Host</label>
                    <input 
                      type="text" 
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="smtp.domain.com" 
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Porta</label>
                      <input 
                        type="text" 
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        placeholder="587" 
                        className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input 
                        type="checkbox" 
                        id="secure"
                        checked={secure}
                        onChange={(e) => setSecure(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-zinc-950"
                      />
                      <label htmlFor="secure" className="text-xs font-black text-zinc-400 uppercase tracking-widest cursor-pointer">SSL / TLS Seguro</label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Limite Diário de Disparos</label>
                    <input 
                      type="number" 
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SMTP Usuário</label>
                    <input 
                      type="text" 
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SMTP Senha / App Password</label>
                    <input 
                      type="password" 
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-[16px] text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-indigo-500 text-white px-6 py-3 rounded-[16px]"
                    >
                      {isSubmitting ? 'Salvando...' : 'Conectar SMTP'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {inboxes.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-12 text-center">
              <EnvelopeIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Nenhuma caixa conectada</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
                Adicione SMTPs adicionais para que o Vysify rotacione automaticamente os envios e proteja a reputação de seus domínios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {inboxes.map((inbox) => {
                const checkResult = dnsResults[inbox.id];
                return (
                  <div 
                    key={inbox.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-zinc-950 rounded-[18px] border border-zinc-800 flex items-center justify-center">
                        <EnvelopeIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-white">{inbox.email}</h3>
                          <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                            inbox.isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                          }`}>
                            {inbox.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 font-medium space-x-4">
                          <span>Provedor: {inbox.provider}</span>
                          <span>•</span>
                          <span>Disparados Hoje: {inbox.sentToday} / {inbox.dailyLimit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
                      {/* DNS Records badges */}
                      {checkResult && (
                        <div className="flex gap-2 bg-zinc-950 px-4 py-2.5 rounded-[16px] border border-zinc-800 text-[10px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-1">
                            <span>MX:</span>
                            {checkResult.mx.valid ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /> : <XCircleIcon className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <span>|</span>
                          <div className="flex items-center gap-1">
                            <span>SPF:</span>
                            {checkResult.spf.valid ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /> : <XCircleIcon className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <span>|</span>
                          <div className="flex items-center gap-1">
                            <span>DMARC:</span>
                            {checkResult.dmarc.valid ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" /> : <XCircleIcon className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => handleCheckDns(inbox)}
                        disabled={checkingDns === inbox.id}
                        className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-[14px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${checkingDns === inbox.id ? 'animate-spin' : ''}`} />
                        Verificar DNS
                      </button>

                      <button 
                        onClick={() => handleToggleInbox(inbox.id, inbox.isActive)}
                        className={`px-4 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-colors ${
                          inbox.isActive 
                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {inbox.isActive ? 'Pausar' : 'Ativar'}
                      </button>

                      <button 
                        onClick={() => handleDeleteInbox(inbox.id)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-[14px] border border-red-500/10 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
