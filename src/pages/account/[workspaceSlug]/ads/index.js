import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ChartBarIcon, CursorArrowRaysIcon, ArrowTrendingUpIcon, PlusCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import GlowingAreaChart from '@/components/Charts/GlowingAreaChart';

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
  const trend = metrics.trend || [];

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspaceSlug} | Meta Ads Analytics`} />
      
      <div className="relative min-h-[80vh]">
        {/* Subtle Glow Effects for Light/Dark Harmony */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="relative z-10 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-2 italic">
                Meta Ads <span className="text-indigo-600 dark:text-indigo-400">Analytics</span>
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-[11px] italic">
                Controle de ROI em tempo real (Últimos 30 Dias)
              </p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-3">
                 <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-2xl shadow-premium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest italic">Sincronizado</span>
                 </span>
                 <button
                   onClick={handleDisconnect}
                   className="text-[10px] font-black uppercase tracking-widest italic text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 px-5 py-2.5 rounded-2xl transition-all border border-rose-500/20 shadow-premium"
                 >
                   Desconectar
                 </button>
              </div>
            )}
          </div>

          {!isLoading && !isConnected && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
               className="vysify-glass flex flex-col items-center justify-center p-20 rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-24 h-24 bg-[#1877F2]/10 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/10">
                 <svg className="w-12 h-12 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                 </svg>
              </div>
              <h2 className="text-3xl font-black uppercase text-zinc-900 dark:text-white mb-4 italic italic tracking-tight">Conecte seu Gerenciador de Anúncios</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-lg mb-10 font-medium leading-relaxed italic">
                Descubra quais anúncios estão gerando leads reais no WhatsApp e veja seu Custo por Lead (CPL) preciso no nosso painel exclusivo.
              </p>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-black uppercase tracking-widest italic py-4 px-10 rounded-2xl transition-all disabled:opacity-50 shadow-2xl shadow-blue-500/20 active:scale-95"
              >
                {isConnecting ? 'Redirecionando...' : 'Conectar Meta Ads Cloud'}
              </button>
            </motion.div>
          )}

          {!isLoading && isConnected && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {[
                  { title: 'Investimento', value: formatCurrency(summary.spend), icon: ChartBarIcon, color: 'blue' },
                  { title: 'Leads Totais', value: summary.leads, icon: CursorArrowRaysIcon, color: 'indigo', highlight: true },
                  { title: 'Custo por Lead', value: formatCurrency(summary.cpl), icon: ArrowTrendingUpIcon, color: 'violet' },
                  { title: 'ROAS Projetado', value: summary.roas > 0 ? `${summary.roas}x` : 'N/D', icon: ArrowTrendingUpIcon, color: 'emerald' },
                ].map((kpi, idx) => (
                  <div key={kpi.title} className={`vysify-glass p-8 rounded-[2.5rem] relative overflow-hidden group transition-all hover:-translate-y-1 ${kpi.highlight ? 'ring-2 ring-indigo-500/20 shadow-indigo-500/10' : ''}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <div className={`p-3 rounded-xl bg-${kpi.color}-500/10 text-${kpi.color}-600 dark:text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                           <kpi.icon className="w-5 h-5 stroke-[2.5]" />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">{kpi.title}</span>
                      </div>
                      <div className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter">
                        {kpi.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Chart Card */}
              <div className="vysify-glass p-10 mb-12 rounded-[3rem] overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-1000" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                   <div>
                     <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">Performance de Investimento</h3>
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 italic">Variação de gastos acumulados • Tempo Real</p>
                   </div>
                   <div className="px-6 py-2.5 bg-zinc-950 dark:bg-black rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] border border-indigo-500/20 shadow-2xl italic">Analytics Protocol</div>
                </div>
                
                <div className="h-[350px] w-full">
                  {trend.length > 0 ? (
                    <GlowingAreaChart
                      data={trend}
                      xKey="date"
                      yKey="value"
                      color="#6366f1"
                      formatYAxis={(val) => `R$${val}`}
                      formatTooltipValue={(val) => formatCurrency(val)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem]">
                      <ExclamationTriangleIcon className="w-12 h-12 text-zinc-300 mb-6 opacity-40" />
                      <p className="text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-[0.3em] text-[11px] italic">Sincronizando Histórico...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela de Campanhas */}
              <div className="vysify-glass rounded-[3rem] overflow-hidden shadow-premium">
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-black/20">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">Relatório de Campanhas</h3>
                  <div className="hidden md:flex items-center gap-3">
                     <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-glow-indigo animate-pulse" />
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Live Optimization Active</span>
                  </div>
                </div>
                {campaigns.length === 0 ? (
                  <div className="p-20 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-6 text-zinc-200" />
                    <p className="text-zinc-400 font-black uppercase tracking-widest italic">Nenhuma campanha detectada no período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-950/40 text-[10px] uppercase text-zinc-400 dark:text-zinc-500 font-black tracking-[0.2em] italic">
                          <th className="px-10 py-6">ID / Protocolo</th>
                          <th className="px-10 py-6">Status da Operação</th>
                          <th className="px-10 py-6 text-right">Gasto</th>
                          <th className="px-10 py-6 text-right">Leads</th>
                          <th className="px-10 py-6 text-right pr-10">CPL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {campaigns.map((camp) => (
                          <tr key={camp.id} className="hover:bg-zinc-50/50 dark:hover:bg-indigo-500/[0.03] transition-all group">
                            <td className="px-10 py-8">
                              <div className="font-black text-[16px] text-zinc-900 dark:text-white uppercase italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tighter">
                                {camp.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1.5 opacity-60">Conta: {camp.adAccountName}</div>
                            </td>
                            <td className="px-10 py-8">
                              <span className={`px-4 py-2 text-[10px] font-black uppercase rounded-2xl tracking-widest italic border ${
                                camp.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                  : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                              }`}>
                                {camp.status}
                              </span>
                            </td>
                            <td className="px-10 py-8 text-right font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatCurrency(camp.spend)}</td>
                            <td className="px-10 py-8 text-right">
                               <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 ring-1 ring-indigo-500/5">
                                 <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 italic tabular-nums leading-none">+{camp.leads}</span>
                               </div>
                            </td>
                            <td className="px-10 py-8 text-right pr-10 font-black text-zinc-900 dark:text-white italic tabular-nums">{formatCurrency(camp.cpl)}</td>
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
            <div className="flex flex-col items-center justify-center p-32 gap-6">
              <div className="w-16 h-16 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-spin shadow- glow-indigo"></div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic animate-pulse">Establishing Graph Connection...</span>
            </div>
          )}

        </div>
      </div>
    </AccountLayout>
  );
};

export default AdsDashboard;
