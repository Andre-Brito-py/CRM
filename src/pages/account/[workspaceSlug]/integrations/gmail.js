import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { 
  EnvelopeIcon, 
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ArrowUpRightIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const GmailIntegration = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { workspaceSlug } = router.query;
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/gmail` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const connected = !!data?.data?.credentials?.refreshToken || !!data?.data?.credentials?.accessToken;
  const isLoading = !data && !error;

  const [gmailAddress, setGmailAddress] = useState('');

  useEffect(() => {
    if (data?.data?.credentials?.connectedEmail) {
      setGmailAddress(data.data.credentials.connectedEmail);
    }
  }, [data]);

  const handleConnect = () => {
    if (!workspaceSlug) return;
    window.location.href = `/api/workspace/${workspaceSlug}/integrations/gmail/connect`;
  };

  const handleDisconnect = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: false,
          credentials: {}
        }),
      });
      toast.success(t('gmail.status.offline'));
      setGmailAddress('');
      mutate();
    } catch (error) {
      toast.error('Failed to disconnect');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const saveGmailAddress = async (e) => {
    e.preventDefault();
    if (!gmailAddress) {
      toast.error('Por favor, insira um e-mail do Gmail válido.');
      return;
    }
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: true, 
          credentials: { 
            ...data?.data?.credentials, 
            connectedEmail: gmailAddress 
          } 
        }),
      });
      toast.success('Configurações de e-mail do Gmail atualizadas com sucesso!');
      mutate();
    } catch (error) {
      toast.error('Falha ao salvar e-mail do Gmail');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  if (error) {
    return (
      <AccountLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-[#fdfdfe] dark:bg-zinc-950 p-6 text-center">
          <InformationCircleIcon className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-executive font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mb-2">
            Erro ao carregar integração
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-6 font-semibold leading-relaxed">
            Não foi possível validar seu acesso a este workspace. Certifique-se de que sua conta é membro ativo de {workspaceSlug}.
          </p>
        </div>
      </AccountLayout>
    );
  }

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center h-screen bg-[#fdfdfe] dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-zinc-100 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-50 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{t('common.loading')}</span>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="py-12 bg-[#fdfdfe] dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EA4335] rounded-[14px] flex items-center justify-center shadow-glow-red/20">
                <EnvelopeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em]">{t('gmail.integration')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tighter leading-none mb-4">
              {t('gmail.title')}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg max-w-2xl leading-relaxed">
              {t('gmail.subtitle')}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            onClick={connected ? handleDisconnect : handleConnect}
            className={`px-8 py-4 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all shadow-premium flex items-center gap-2 ${
              connected 
              ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
              : 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 border border-transparent'
            }`}
          >
            {isSubmitting && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {connected ? t('gmail.action.disconnect') : t('gmail.action.connect')}
          </motion.button>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 p-10 shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-red-50 dark:bg-red-950/10 rounded-full blur-3xl -mr-40 -mt-40 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter mb-2">{t('gmail.syncStatus')}</h3>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 font-medium">{t('gmail.syncStatusDesc')}</p>
                      </div>
                      {connected ? (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/30 shadow-glow-emerald/10">
                          <CheckCircleIcon className="w-4 h-4 animate-pulse-subtle" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('gmail.status.connected')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                          <InformationCircleIcon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('gmail.status.offline')}</span>
                        </div>
                      )}
                    </div>

                    {/* Gmail Address Input Card */}
                    <div className="bg-zinc-50 dark:bg-zinc-850/50 rounded-[24px] border border-zinc-100 dark:border-zinc-800 p-6 mb-8">
                      <h4 className="font-executive font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
                        {t('gmail.accountConfig')}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4">
                        {t('gmail.accountConfigDesc')}
                      </p>
                      <form onSubmit={saveGmailAddress} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          value={gmailAddress}
                          onChange={(e) => setGmailAddress(e.target.value)}
                          placeholder={t('gmail.input.placeholder')}
                          className="flex-grow px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                          required
                        />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-3 rounded-2xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          {isSubmitting && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                          {t('gmail.action.saveEmail')}
                        </motion.button>
                      </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      {[
                        { title: t('gmail.feature.twoway.title'), desc: t('gmail.feature.twoway.desc'), icon: GlobeAltIcon, color: 'blue' },
                        { title: t('gmail.feature.autocontact.title'), desc: t('gmail.feature.autocontact.desc'), icon: CheckCircleIcon, color: 'emerald' },
                        { title: t('gmail.feature.tracking.title'), desc: t('gmail.feature.tracking.desc'), icon: ArrowPathIcon, color: 'purple' },
                        { title: t('gmail.feature.historical.title'), desc: t('gmail.feature.historical.desc'), icon: ShieldCheckIcon, color: 'red' },
                      ].map((feature, i) => (
                        <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-850/50 rounded-[24px] border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                          <div className={`w-10 h-10 rounded-xl bg-${feature.color}-50 dark:bg-${feature.color}-950/20 flex items-center justify-center mb-4`}>
                            <feature.icon className={`w-5 h-5 text-${feature.color}-500 dark:text-${feature.color}-400`} />
                          </div>
                          <h4 className="font-executive font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">{feature.title}</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{feature.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="bg-zinc-950 dark:bg-zinc-900 rounded-[40px] border dark:border-zinc-800 p-10 text-white shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mt-32 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-white dark:bg-zinc-800 shadow-premium rounded-[32px] flex items-center justify-center flex-shrink-0 animate-float">
                      <ShieldCheckIcon className="w-10 h-10 text-zinc-900 dark:text-zinc-100" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-2 text-center md:text-left">{t('gmail.privacy.title')}</h3>
                      <p className="text-white/50 dark:text-white/40 text-sm leading-relaxed font-medium mb-0 text-center md:text-left">
                        {t('gmail.privacy.desc')}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 p-8 shadow-premium relative overflow-hidden">
                <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter mb-6">{t('gmail.guide.title')}</h3>
                <div className="space-y-6">
                  {[
                    { step: '01', title: t('gmail.guide.step1.title'), desc: t('gmail.guide.step1.desc') },
                    { step: '02', title: t('gmail.guide.step2.title'), desc: t('gmail.guide.step2.desc') },
                    { step: '03', title: t('gmail.guide.step3.title'), desc: t('gmail.guide.step3.desc') },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest group-hover:text-zinc-950 dark:group-hover:text-zinc-200 transition-colors">{item.step}</span>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-1 leading-none">{item.title}</h4>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-zinc-50 dark:border-zinc-800/50 text-center">
                  <a href="#" className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-950 dark:text-zinc-200 uppercase tracking-widest hover:translate-x-1 transition-transform">
                    {t('gmail.guide.learn')}
                    <ArrowUpRightIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

               <div className="bg-[#f0f9ff] dark:bg-blue-950/20 rounded-[40px] border border-blue-100 dark:border-blue-900/30 p-8 relative overflow-hidden">
                <div className="relative z-10 text-center">
                   <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-blue/10 border border-blue-100 dark:border-blue-900/30">
                     <GlobeAltIcon className="w-6 h-6 text-blue-500" />
                   </div>
                   <h3 className="text-lg font-executive font-extrabold text-blue-900 dark:text-blue-200 tracking-tighter leading-none mb-3">{t('gmail.health.title')}</h3>
                   <p className="text-[10px] text-blue-700/70 dark:text-blue-300/70 font-black uppercase tracking-widest mb-6">{t('gmail.health.realtime')}</p>
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                       <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('gmail.health.rateLimit')}</span>
                       <span className="text-[10px] font-black text-blue-900 dark:text-blue-100 tabular-nums">1.2k/hr</span>
                     </div>
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                       <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('gmail.health.lastSync')}</span>
                       <span className="text-[10px] font-black text-blue-900 dark:text-blue-100 tabular-nums">{t('gmail.health.justNow')}</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

export default GmailIntegration;
