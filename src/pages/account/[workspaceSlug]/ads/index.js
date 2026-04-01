import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ChartBarIcon, CursorArrowRaysIcon, ArrowTrendingUpIcon, PlusCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const formatCurrency = (value) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const AdsDashboard = () => {
  const router = useRouter();
  const { workspaceSlug, error, success } = router.query;

  const { data, error: fetchError, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/ads/metrics` : null,
    fetcher
  );

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (error === 'auth_denied') {
      toast.error('Você cancelou a autorização do Facebook.');
      router.replace(`/account/${workspaceSlug}/ads`, undefined, { shallow: true });
    } else if (error === 'auth_failed' || error === 'internal_error') {
      toast.error('Falha ao conectar conta do Meta Ads.');
      router.replace(`/account/${workspaceSlug}/ads`, undefined, { shallow: true });
    } else if (success === 'true') {
      toast.success('Meta Ads conectado com sucesso!');
      router.replace(`/account/${workspaceSlug}/ads`, undefined, { shallow: true });
    }
  }, [error, success, workspaceSlug, router]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/ads/connect`);
      if (response && response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Erro ao gerar URL de conexão.');
        setIsConnecting(false);
      }
    } catch (err) {
      toast.error('Erro ao conectar com Meta Ads.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Meta Ads? Você perderá o acesso às métricas em tempo real.')) return;
    try {
      await api(`/api/workspace/${workspaceSlug}/ads/disconnect`, { method: 'POST' });
      toast.success('Meta Ads desconectado com sucesso.');
      mutate();
    } catch (err) {
      toast.error('Erro ao desconectar.');
    }
  };

  const isLoading = !data && !fetchError;
  const isConnected = data?.data?.isConnected || false;
  const metrics = data?.data || {};
  const campaigns = metrics.campaigns || [];
  const summary = metrics.summary || { spend: 0, leads: 0, cpl: 0, roas: 0 };

  return (
    <AccountLayout>
      {/* Premium Dark Mode Wrapper only for this page specifically inside the AccountLayout */}
      <div className="bg-[#0b141a] min-h-screen text-white rounded-2xl relative overflow-hidden font-executive border border-zinc-800 m-4 shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="relative z-10 p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2">Meta Ads <span className="text-zinc-500">Analytics</span></h1>
              <p className="text-zinc-400 font-medium">Controle de ROI em tempo real (Últimos 30 Dias)</p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-3">
                 <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-400 text-xs font-bold uppercase">Sincronizado</span>
                 </span>
                 <button
                   onClick={handleDisconnect}
                   className="text-xs font-bold uppercase text-red-500/80 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-full transition-colors border border-red-500/10"
                 >
                   Desconectar
                 </button>
              </div>
            )}
          </div>

          {!isLoading && !isConnected && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center justify-center p-20 bg-zinc-900/50 border border-white/5 rounded-3xl"
            >
              <div className="w-20 h-20 bg-[#1877F2]/10 rounded-full flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                 </svg>
              </div>
              <h2 className="text-2xl font-black uppercase text-white mb-3">Conecte seu Gerenciador de Anúncios</h2>
              <p className="text-zinc-400 text-center max-w-md mb-8">
                Descubra quais anúncios estão gerando leads reais no WhatsApp e veja seu Custo por Lead (CPL) preciso no nosso painel exclusivo.
              </p>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50"
              >
                {isConnecting ? 'Redirecionando...' : 'Conectar Meta Ads'}
              </button>
            </motion.div>
          )}

          {!isLoading && isConnected && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-zinc-400 mb-4">
                    <ChartBarIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Investimento</span>
                  </div>
                  <div className="text-3xl font-black text-white">{formatCurrency(summary.spend)}</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-indigo-400 mb-4">
                    <CursorArrowRaysIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Leads Totais</span>
                  </div>
                  <div className="text-3xl font-black text-indigo-400">{summary.leads}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-zinc-400 mb-4">
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Custo por Lead (CPL)</span>
                  </div>
                  <div className="text-3xl font-black text-white">{formatCurrency(summary.cpl)}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-zinc-400 mb-4">
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">ROAS Projetado</span>
                  </div>
                  <div className="text-3xl font-black text-white">{summary.roas > 0 ? `${summary.roas}x` : 'N/D'}</div>
                </div>
              </div>

              {/* Tabela de Campanhas */}
              <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Status das Campanhas Ativas</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                     * Atualizado a cada 1 hora via Graph API
                  </div>
                </div>
                {campaigns.length === 0 ? (
                  <div className="p-10 text-center text-zinc-500">
                    <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma campanha com dados de engajamento nos últimos 30 dias.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-black/20 text-xs uppercase text-zinc-500 font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Campanha</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Gasto</th>
                          <th className="px-6 py-4">Leads</th>
                          <th className="px-6 py-4">CPL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {campaigns.map((camp) => (
                          <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-5">
                              <div className="font-bold text-white">{camp.name}</div>
                              <div className="text-xs text-zinc-500 mt-1">Conta: {camp.adAccountName} • ID: {camp.id}</div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${camp.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                {camp.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 font-medium text-white">{formatCurrency(camp.spend)}</td>
                            <td className="px-6 py-5 font-bold text-indigo-400">{camp.leads}</td>
                            <td className="px-6 py-5 font-medium text-white">{formatCurrency(camp.cpl)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center p-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

        </div>
      </div>
    </AccountLayout>
  );
};

export default AdsDashboard;
