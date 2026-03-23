import { useState, Fragment } from 'react';
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
  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/gmail` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const isLoading = !data;

  const toggleIntegration = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      toast.success(`Gmail integration ${!enabled ? t('common.status.enabled') : t('common.status.disabled')} successfully`);
      mutate();
    } catch (error) {
      toast.error('Failed to update integration');
      console.error(error);
    } finally {
      setSubmittingState(false);
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

  return (
    <AccountLayout>
      <div className="py-12 bg-[#fdfdfe] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EA4335] rounded-[14px] flex items-center justify-center shadow-glow-red/20">
                <EnvelopeIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em]">{t('gmail.integration', 'Google Workspace')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 tracking-tighter leading-none mb-4">
              Gmail Sync
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed">
              Fully synchronize your corporate emails and contacts with the CRM.
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            onClick={toggleIntegration}
            className={`px-8 py-4 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all shadow-premium flex items-center gap-2 ${
              enabled 
              ? 'bg-red-50 text-red-600 border border-red-100' 
              : 'bg-zinc-950 text-white border border-transparent'
            }`}
          >
            {isSubmitting && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {enabled ? 'Disconnect Account' : 'Connect Gmail'}
          </motion.button>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white rounded-[40px] border border-zinc-100 p-10 shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-red-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-2">Sync Status</h3>
                        <p className="text-sm text-zinc-400 font-medium">Control the data flow between Gmail and your Workspace.</p>
                      </div>
                      {enabled ? (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-glow-emerald/10">
                          <CheckCircleIcon className="w-4 h-4 animate-pulse-subtle" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-400 rounded-full border border-zinc-200/50">
                          <InformationCircleIcon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      {[
                        { title: 'Two-way Sync', desc: 'Read and reply to emails from either Gmail or CRM.', icon: GlobeAltIcon, color: 'blue' },
                        { title: 'Auto-Contact', desc: 'New recipients are automatically added as leads.', icon: CheckCircleIcon, color: 'emerald' },
                        { title: 'Email Tracking', desc: 'Real-time notifications for opens and link clicks.', icon: ArrowPathIcon, color: 'purple' },
                        { title: 'Historical Sync', desc: 'Import past conversations to populate timelines.', icon: ShieldCheckIcon, color: 'red' },
                      ].map((feature, i) => (
                        <div key={i} className="p-6 bg-zinc-50 rounded-[24px] border border-zinc-100 hover:border-zinc-200 transition-colors">
                          <div className={`w-10 h-10 rounded-xl bg-${feature.color}-50 flex items-center justify-center mb-4`}>
                            <feature.icon className={`w-5 h-5 text-${feature.color}-500`} />
                          </div>
                          <h4 className="font-executive font-extrabold text-zinc-900 mb-2">{feature.title}</h4>
                          <p className="text-xs text-zinc-500 leading-relaxed font-medium">{feature.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="bg-zinc-950 rounded-[40px] p-10 text-white shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mt-32 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-white shadow-premium rounded-[32px] flex items-center justify-center flex-shrink-0 animate-float">
                      <ShieldCheckIcon className="w-10 h-10 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-2 text-center md:text-left">Privacy & Security</h3>
                      <p className="text-white/50 text-sm leading-relaxed font-medium mb-0 text-center md:text-left">
                        We use Google's OAuth 2.0 protocol. Your password is never stored and data is encrypted end-to-end.
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-[40px] border border-zinc-100 p-8 shadow-premium relative overflow-hidden">
                <h3 className="text-xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-6">Quick Guide</h3>
                <div className="space-y-6">
                  {[
                    { step: '01', title: 'Sign in', desc: 'Authorize Closify to access your corporate Gmail inbox.' },
                    { step: '02', title: 'Configure', desc: 'Select which labels or folders you want to synchronize.' },
                    { step: '03', title: 'Enjoy', desc: 'Your email history will start appearing in contact profiles.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest group-hover:text-zinc-950 transition-colors">{item.step}</span>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight mb-1 leading-none">{item.title}</h4>
                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-zinc-50 text-center">
                  <a href="#" className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-950 uppercase tracking-widest hover:translate-x-1 transition-transform">
                    Learn about Sync
                    <ArrowUpRightIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

               <div className="bg-[#f0f9ff] rounded-[40px] border border-blue-100 p-8 relative overflow-hidden">
                <div className="relative z-10 text-center">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-blue/10 border border-blue-100">
                     <GlobeAltIcon className="w-6 h-6 text-blue-500" />
                   </div>
                   <h3 className="text-lg font-executive font-extrabold text-blue-900 tracking-tighter leading-none mb-3">Sync Health</h3>
                   <p className="text-[10px] text-blue-700/70 font-black uppercase tracking-widest mb-6">Real-time Connection</p>
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                       <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Rate Limit</span>
                       <span className="text-[10px] font-black text-blue-900 tabular-nums">1.2k/hr</span>
                     </div>
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                       <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Last Sync</span>
                       <span className="text-[10px] font-black text-blue-900 tabular-nums">Just now</span>
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
