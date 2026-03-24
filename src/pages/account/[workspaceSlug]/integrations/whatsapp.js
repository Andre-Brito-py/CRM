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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const WhatsAppSettings = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = router.query;
  const { data: whatsappAnalytics } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics?scope=whatsapp` : null, api);
  const [mounted, setMounted] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentEditId, setCurrentEditId] = useState(null);

  const [config, setConfig] = useState({
    name: '',
    enabled: true,
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
    businessAccountId: '',
  });

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
      if (currentEditId) {
        await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp/${currentEditId}`, {
          method: 'PUT',
          body: config,
        });
        toast.success(t('whatsapp.settings.updated'));
      } else {
        await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp`, {
          method: 'POST',
          body: config,
        });
        toast.success(t('whatsapp.settings.added'));
      }

      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      toast.error(`${error?.error?.msg || t('whatsapp.settings.saveFailed')}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (integrationId) => {
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

  const openNewModal = () => {
    setCurrentEditId(null);
    setConfig({
      name: '',
      enabled: true,
      phoneNumberId: '',
      accessToken: '',
      verifyToken: '',
      businessAccountId: '',
    });
    setShowModal(true);
  };

  const openEditModal = (integration) => {
    setCurrentEditId(integration.id);
    setConfig({
      name: integration.name,
      enabled: integration.enabled,
      phoneNumberId: integration.credentials?.phoneNumberId || '',
      accessToken: integration.credentials?.accessToken || '',
      verifyToken: integration.credentials?.verifyToken || '',
      businessAccountId: integration.credentials?.businessAccountId || '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
              WhatsApp Cloud
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed">
              {t('whatsapp.settings.subtitle')}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="whatsapp-add-btn" 
            className="group flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-premium hover:shadow-premium-lg transition-all" 
            onClick={openNewModal}
          >
            <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90" /> 
            {t('whatsapp.settings.addNumber')}
          </motion.button>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatsappTrendChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', padding: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      <Bar dataKey="inbound" name={t('analytics.whatsapp.inbound')} stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive animationDuration={1200} />
                      <Bar dataKey="outbound" name={t('analytics.whatsapp.outbound')} stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

            <div className="bg-zinc-950 rounded-[32px] p-10 text-white relative overflow-hidden shadow-premium flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                  <LinkIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-4">Connection Guide</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                  Connect your business numbers via Meta&apos;s Cloud API to start receiving messages directly in Vysify.
                </p>
                <ul className="space-y-4">
                  {[
                    'Create a Meta App',
                    'Configure Webhooks',
                    'Generate Access Token'
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-300">
                      <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-zinc-500 border border-white/5">{i+1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
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
                    onClick={openNewModal}
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
                        <button onClick={() => openEditModal(integration)} className="p-2.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-all">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(integration.id)} className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4 pt-6 mt-2 border-t border-zinc-50 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('whatsapp.settings.card.phoneId')}</span>
                        <span className="text-xs font-black text-zinc-900 tabular-nums">{integration.credentials?.phoneNumberId}</span>
                      </div>
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

      <Transition.Root show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={setShowModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-[32px] bg-white text-left shadow-premium transition-all sm:my-8 sm:w-full sm:max-w-xl border border-zinc-100">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                  
                  <div className="bg-white px-8 pb-8 pt-10 relative z-10">
                    <div className="sm:flex sm:items-start mb-8">
                      <div className="mx-auto flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] bg-emerald-50 sm:mx-0 border border-emerald-100 shadow-glow-emerald/10">
                        <LinkIcon className="h-7 w-7 text-emerald-600" aria-hidden="true" />
                      </div>
                      <div className="mt-3 text-center sm:ml-6 sm:mt-0 sm:text-left">
                        <Dialog.Title as="h3" className="text-2xl font-executive font-extrabold leading-none text-zinc-950 tracking-tighter mb-2">
                          {currentEditId ? t('whatsapp.settings.modal.editTitle') : t('whatsapp.settings.modal.connectTitle')}
                        </Dialog.Title>
                        <p className="text-sm text-zinc-400 font-medium">
                          {t('whatsapp.settings.modal.subtitle', 'Configure your WhatsApp Cloud API credentials below.')}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex items-center h-5">
                          <input
                            id="enabled"
                            name="enabled"
                            type="checkbox"
                            checked={config.enabled}
                            onChange={handleChange}
                            className="h-5 w-5 rounded-lg border-zinc-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                          />
                        </div>
                        <label htmlFor="enabled" className="text-sm font-black text-zinc-500 uppercase tracking-widest cursor-pointer ml-1">
                          {t('whatsapp.settings.modal.enable')}
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('whatsapp.settings.modal.friendlyName')}</label>
                        <input
                          type="text"
                          name="name"
                          value={config.name}
                          onChange={handleChange}
                          placeholder={t('whatsapp.settings.modal.friendlyNamePlaceholder')}
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">
                          {t('whatsapp.settings.modal.webhookUrl')} 
                        </label>
                        <div id="whatsapp-webhook-url" className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={webhookUrl}
                            className="flex-1 px-5 py-3.5 bg-zinc-100/50 border border-zinc-100 rounded-[18px] text-zinc-400 font-black tracking-tight text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookUrl);
                              toast.success(t('common.copied'));
                            }}
                            className="px-5 py-3.5 bg-zinc-950 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-premium"
                          >
                            {t('common.action.copy')}
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium ml-3">{t('whatsapp.settings.modal.webhookHint')}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('whatsapp.settings.modal.verifyToken')}</label>
                        <input
                          type="text"
                          name="verifyToken"
                          value={config.verifyToken}
                          onChange={handleChange}
                          placeholder={t('whatsapp.settings.modal.verifyTokenPlaceholder')}
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('whatsapp.settings.modal.phoneNumberId')}</label>
                          <input
                            type="text"
                            name="phoneNumberId"
                            value={config.phoneNumberId}
                            onChange={handleChange}
                            className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300 text-center tabular-nums font-black"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('whatsapp.settings.modal.businessAccountId')}</label>
                          <input
                            type="text"
                            name="businessAccountId"
                            value={config.businessAccountId}
                            onChange={handleChange}
                            className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300 text-center tabular-nums font-black"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pb-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('whatsapp.settings.modal.accessToken')}</label>
                        <input
                          type="password"
                          name="accessToken"
                          value={config.accessToken}
                          onChange={handleChange}
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
                          required
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-50">
                        <button
                          type="button"
                          className="flex-1 px-8 py-4 bg-zinc-100 text-zinc-500 rounded-[22px] text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                          onClick={() => setShowModal(false)}
                        >
                          {t('common.action.cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-1 px-8 py-4 bg-zinc-950 text-white rounded-[22px] text-xs font-black uppercase tracking-widest hover:shadow-premium-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-premium flex items-center justify-center gap-2"
                        >
                          {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                          {isSaving ? t('common.saving') : t('whatsapp.settings.modal.save')}
                        </button>
                      </div>
                    </form>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </AccountLayout>
  );
};

export default WhatsAppSettings;
