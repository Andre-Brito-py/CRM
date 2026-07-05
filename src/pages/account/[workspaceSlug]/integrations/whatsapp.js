import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  ChatBubbleLeftRightIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
// import Modal from '@/components/Modal/index'; // We'll use headlessui directly if possible for better control
import { Dialog, Transition } from '@headlessui/react';
import Card from '@/components/Card/index';
import api from '@/lib/common/api';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import GlowingAreaChart from '@/components/Charts/GlowingAreaChart';

const CountUp = ({ value, durationMs = 900, className = '' }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, value]);

  return <span className={className}>{current}</span>;
};

const WhatsAppSettings = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = router.query;
  const { data: whatsappAnalytics } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics?scope=whatsapp` : null, api);
  const [mounted, setMounted] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  // Evolution API States
  const [qrCode, setQrCode] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const messageTotals = whatsappAnalytics?.messageTotals || { inbound: 0, outbound: 0, total: 0 };

  const locale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    if (base === 'pt') return 'pt-BR';
    return base;
  }, [i18n?.language]);

  const whatsappTrendChart = useMemo(() => {
    const format = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    };
    const trend = whatsappAnalytics?.messageTrend || [];
    return trend.map((d) => ({
      day: format(d.date),
      inbound: d.inbound || 0,
      outbound: d.outbound || 0,
      total: d.total || 0,
    }));
  }, [locale, whatsappAnalytics?.messageTrend]);



  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp`, {
        method: 'GET',
      });
      if (response.data && response.data.integrations) {
        setIntegrations(response.data.integrations);
      }
    } catch (error) {
      toast.error(t('whatsapp.settings.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, workspaceSlug]);

  useEffect(() => {
    setMounted(true);
    if (workspaceSlug) {
      fetchIntegrations();
    }
  }, [fetchIntegrations, workspaceSlug]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let response;
      if (currentEditId) {
        response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/${currentEditId}`, {
          method: 'PUT',
          body: config,
        });
      } else {
        response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp`, {
          method: 'POST',
          body: config,
        });
      }

      if (!response.ok) {
        throw response;
      }

      if (currentEditId) {
        toast.success(t('whatsapp.settings.updated'));
      } else {
        toast.success(t('whatsapp.settings.added'));
      }

      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      toast.error(`${error?.error?.msg || error?.message || t('whatsapp.settings.saveFailed')}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Evolution API Connection Logic
  const generateQrCode = async () => {
    setIsGeneratingQr(true);
    setQrCode(null);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/evolution/connect`, {
        method: 'POST',
      });
      if (response.error) {
        toast.error(response.error.msg || 'Erro ao gerar QR Code');
      } else if (response.data?.qrcode) {
        setQrCode(response.data.qrcode);
        setConnectionStatus('scanning');
        toast.success('QR Code gerado com sucesso! Escaneie para conectar.');
      }
    } catch (err) {
      toast.error('Erro de conexão ao gerar QR Code.');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleEvolutionDisconnect = async () => {
    if (confirm('Tem certeza de que deseja desconectar este número de WhatsApp? Todos os envios de mensagens do Closer AI serão interrompidos.')) {
      setIsLoading(true);
      try {
        const response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/evolution/disconnect`, {
          method: 'POST',
        });
        if (response.error) {
          toast.error(response.error.msg || 'Erro ao desconectar.');
        } else {
          toast.success('WhatsApp desconectado com sucesso.');
          setConnectionStatus('disconnected');
          setQrCode(null);
          fetchIntegrations();
        }
      } catch (err) {
        toast.error('Erro de conexão ao desconectar.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Sync connectionStatus with integrations loaded from DB
  useEffect(() => {
    if (integrations.length > 0) {
      const hasEvo = integrations.find(i => i.provider === 'EVOLUTION');
      if (hasEvo) {
        setConnectionStatus(hasEvo.credentials?.status === 'open' ? 'open' : 'disconnected');
      } else {
        setConnectionStatus('disconnected');
      }
    } else {
      setConnectionStatus('disconnected');
    }
  }, [integrations]);

  // Polling for QR Code status updates
  useEffect(() => {
    let intervalId;
    if (connectionStatus === 'scanning' && workspaceSlug) {
      intervalId = setInterval(async () => {
        try {
          const response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/evolution/status`);
          if (response.data?.status === 'open') {
            setConnectionStatus('open');
            setQrCode(null);
            toast.success('WhatsApp conectado com sucesso!');
            clearInterval(intervalId);
            fetchIntegrations();
          }
        } catch (err) {
          console.error('Erro ao verificar status do WhatsApp:', err);
        }
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [connectionStatus, workspaceSlug, fetchIntegrations]);

  const handleDelete = async (integration) => {
    if (integration.provider === 'EVOLUTION') {
      await handleEvolutionDisconnect();
      return;
    }
    const integrationId = integration.id;
    if (confirm(t('whatsapp.settings.deleteConfirm'))) {
      try {
        await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/${integrationId}`, {
          method: 'DELETE',
        });
        toast.success(t('whatsapp.settings.removed'));
        fetchIntegrations();
      } catch (error) {
        toast.error(t('whatsapp.settings.deleteFailed'));
      }
    }
  };



  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center h-screen bg-[#fdfdfe]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{t('common.loading')}</span>
          </div>
        </div>
      </AccountLayout>
    );
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/integrations/whatsapp/webhook?workspace=${workspaceSlug}`
    : '';

  const whatsappSteps = [
    {
      element: '#whatsapp-add-btn',
      popover: {
        title: t('onboarding.tour.whatsapp.step1.title'),
        description: t('onboarding.tour.whatsapp.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#whatsapp-webhook-url',
      popover: {
        title: t('onboarding.tour.whatsapp.step2.title'),
        description: t('onboarding.tour.whatsapp.step2.desc'),
        position: 'top',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="whatsapp-tour" steps={whatsappSteps} />
      <div className="py-12 bg-[#fdfdfe] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-[14px] flex items-center justify-center shadow-glow-emerald/30">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-black text-green-600 uppercase tracking-[0.2em]">{t('whatsapp.integration')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 tracking-tighter leading-none mb-4">
              WhatsApp Integration
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed">
              Conecte seu WhatsApp instantaneamente via QR Code para habilitar respostas automáticas com Closer AI e automações omnichannel.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-8 space-y-10">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white rounded-[32px] p-10 border border-zinc-100 shadow-premium overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
                <div>
                  <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter">{t('analytics.whatsapp.title')}</h3>
                  <p className="text-zinc-400 font-medium mt-1">{t('analytics.whatsapp.last30Days')}</p>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                      <ArrowDownLeftIcon className="w-3 h-3 text-emerald-500" />
                      {t('analytics.whatsapp.inbound')}
                    </p>
                    <CountUp value={messageTotals.inbound} className="text-3xl font-executive font-extrabold text-zinc-950 tracking-tight" />
                  </div>
                  <div className="w-[1px] h-10 bg-zinc-100" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                      <ArrowUpRightIcon className="w-3 h-3 text-blue-500" />
                      {t('analytics.whatsapp.outbound')}
                    </p>
                    <CountUp value={messageTotals.outbound} className="text-3xl font-executive font-extrabold text-zinc-950 tracking-tight" />
                  </div>
                </div>
              </div>

              {mounted ? (
                  <div className="h-72 w-full mt-5 relative z-10">
                    <GlowingAreaChart
                      data={whatsappTrendChart}
                      xKey="day"
                      yKey="total"
                      color="#10b981"
                      formatYAxis={(v) => Math.round(v)}
                      formatTooltipValue={(v) => Math.round(v)}
                    />
                  </div>
              ) : null}
            </div>

            <div className="bg-zinc-950 rounded-[32px] p-10 text-white relative overflow-hidden shadow-premium flex flex-col justify-between min-h-[480px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
              <div className="relative z-10 flex flex-col items-center text-center w-full">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-emerald-400" />
                </div>
                
                {connectionStatus === 'open' ? (
                  <div className="w-full">
                    <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-2">WhatsApp Conectado</h3>
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ativo no Workspace</span>
                    </div>
                    
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl w-full mb-8 backdrop-blur-sm flex flex-col items-center">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Número Conectado</span>
                      <span className="text-lg font-black text-zinc-100 tabular-nums">
                        {integrations.find(i => i.provider === 'EVOLUTION')?.credentials?.connectedNumber || 'Número escaneado'}
                      </span>
                    </div>

                    <button
                      onClick={handleEvolutionDisconnect}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      Desconectar WhatsApp
                    </button>
                  </div>
                ) : qrCode ? (
                  <div className="w-full flex flex-col items-center">
                    <h3 className="text-xl font-executive font-extrabold tracking-tighter mb-2">Escaneie o QR Code</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                      Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                    </p>

                    <div className="p-4 bg-white rounded-3xl mb-6 shadow-2xl relative overflow-hidden group">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                      {connectionStatus === 'scanning' && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-zinc-100 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-zinc-800">Aguardando leitura...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={generateQrCode}
                      disabled={isGeneratingQr}
                      className="text-xs font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-all flex items-center gap-1.5"
                    >
                      {isGeneratingQr ? 'Gerando...' : 'Recarregar QR Code'}
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-4">Conexão Instantânea</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                      Conecte seu WhatsApp escaneando um QR Code para habilitar o Closer AI e automações sem limite de 24h.
                    </p>

                    <button
                      onClick={generateQrCode}
                      disabled={isGeneratingQr}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-glow-emerald flex items-center justify-center gap-2"
                    >
                      {isGeneratingQr && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                      {isGeneratingQr ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-10 relative z-10">
                <div className="text-center p-6 bg-white/5 rounded-[24px] border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('analytics.whatsapp.total')}</p>
                  <p className="text-4xl font-executive font-extrabold tracking-tight">
                    <CountUp value={messageTotals.total} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter">Your Connections</h2>
              <div className="px-4 py-1.5 bg-zinc-100 rounded-full border border-zinc-200/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{integrations.length} Active</span>
              </div>
            </div>

            {integrations.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[40px] border border-zinc-100 shadow-premium-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-grid-zinc-100/50 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-zinc-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-zinc-100 group-hover:scale-110 transition-transform duration-500">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-zinc-200" />
                  </div>
                  <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-2">{t('whatsapp.settings.empty.title')}</h3>
                  <p className="text-zinc-400 font-medium max-w-sm mx-auto mb-10">{t('whatsapp.settings.empty.subtitle')}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={generateQrCode}
                    className="px-8 py-4 bg-brand-600 premium-gradient text-white rounded-[22px] text-xs font-black uppercase tracking-widest shadow-glow-emerald"
                  >
                    Get Started
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {integrations.map((integration) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={integration.id} 
                    className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-premium-sm hover:shadow-premium transition-all duration-500 relative group overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center border transition-colors duration-500 ${integration.enabled ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-zinc-100'}`}>
                          <ChatBubbleLeftRightIcon className={`w-7 h-7 ${integration.enabled ? 'text-emerald-500' : 'text-zinc-400'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-executive font-extrabold text-zinc-900 tracking-tight leading-none mb-2">{integration.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${integration.enabled ? 'bg-emerald-500 shadow-glow-emerald animate-pulse-subtle' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                              {integration.enabled ? t('common.status.active') : t('common.status.disabled')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(integration)} className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4 pt-6 mt-2 border-t border-zinc-50 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {integration.provider === 'EVOLUTION' ? 'Método' : t('whatsapp.settings.card.phoneId')}
                        </span>
                        <span className="text-xs font-black text-zinc-900 tabular-nums">
                          {integration.provider === 'EVOLUTION' ? 'QR Code (Evolution)' : integration.credentials?.phoneNumberId}
                        </span>
                      </div>
                      {integration.provider === 'EVOLUTION' && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Número</span>
                          <span className="text-xs font-black text-zinc-950 tabular-nums">{integration.credentials?.connectedNumber || 'Pendente'}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('whatsapp.settings.card.added')}</span>
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-tight">{new Date(integration.createdAt).toLocaleDateString(locale)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

export default WhatsAppSettings;
