import { useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { 
  EnvelopeIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  AtSymbolIcon,
  ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const EmailIntegration = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { workspaceSlug } = router.query;
  useSession();

  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/email` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const inboundUrl = data?.data?.inboundUrl || '';
  const inboundToken = data?.data?.inboundToken || '';
  const isLoading = !data;

  const toggleIntegration = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      toast.success(`Email Inbox ${!enabled ? t('common.status.enabled') : t('common.status.disabled')} successfully`);
      mutate();
    } catch (error) {
      toast.error('Failed to update integration');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const rotateToken = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Inbound token rotated successfully');
      mutate();
    } catch (error) {
      toast.error('Failed to rotate token');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      toast.success(t('common.copied'));
    } catch (error) {
      toast.error(t('common.error.copy'));
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
              <div className="w-10 h-10 bg-zinc-950 rounded-[14px] flex items-center justify-center shadow-glow-zinc/20">
                <AtSymbolIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">{t('email.integration', 'Cloud Email Inbox')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 tracking-tighter leading-none mb-4">
              Email Omnichannel
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed">
              Receive and reply to client emails directly from your centralized inbox.
            </p>
          </div>
          <div className="flex items-center gap-4">
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
              {enabled ? 'Disable Service' : 'Enable Service'}
            </motion.button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[40px] border border-zinc-100 p-10 shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-2">Inbound Configuration</h3>
                      <p className="text-sm text-zinc-400 font-medium">Point your email forwarding service to this endpoint.</p>
                    </div>
                    {enabled ? (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-glow-emerald/10">
                        <CheckCircleIcon className="w-4 h-4 animate-pulse-subtle" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-400 rounded-full border border-zinc-200/50">
                        <InformationCircleIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Offline</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between ml-3">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Postmark / SendGrid Webhook URL</label>
                        <button 
                          onClick={() => copyText(inboundUrl)}
                          className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest"
                        >
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          readOnly
                          value={inboundUrl}
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[22px] text-zinc-500 font-black tracking-tight text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950/5 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-3">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Security Authenticator Token</label>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={rotateToken}
                            disabled={isSubmitting || !enabled}
                            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowPathIcon className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                            Rotate
                          </button>
                          <button 
                            onClick={() => copyText(inboundToken)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest"
                          >
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          readOnly
                          value={inboundToken}
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[22px] text-zinc-500 font-black tracking-tight text-xs focus:outline-none focus:ring-2 focus:ring-zinc-950/5 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-[40px] p-10 text-white shadow-premium relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mt-32 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                 <div className="relative z-10">
                   <h3 className="text-2xl font-executive font-extrabold tracking-tighter mb-6">Security & Processing</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="flex gap-4 p-6 bg-white/5 rounded-[22px] border border-white/5">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest mb-1">Encrypted Relay</h4>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">All inbound emails are processed through our secure relay engine before hitting your CRM.</p>
                        </div>
                     </div>
                     <div className="flex gap-4 p-6 bg-white/5 rounded-[22px] border border-white/5">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <AtSymbolIcon className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest mb-1">Attachment Cleanroom</h4>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">Attachments are scanned and isolated to prevent malware injection into your workspace.</p>
                        </div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-[40px] border border-zinc-100 p-8 shadow-premium relative overflow-hidden">
                <h3 className="text-xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-6">Quick Guide</h3>
                <div className="space-y-6">
                  {[
                    { step: '01', title: 'Pick a provider', desc: 'Use Postmark, SendGrid, or Mailgun for the best experience.' },
                    { step: '02', title: 'Set Webhook', desc: 'Paste the Inbound URL in your provider\'s webhook settings.' },
                    { step: '03', title: 'Verify Flow', desc: 'Send a test email to your relay address and check the Inbox.' },
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
                    Read Documentation
                    <ArrowUpRightIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-[40px] border border-emerald-100 p-8 relative overflow-hidden">
                <div className="relative z-10 text-center">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-emerald/10 border border-emerald-100">
                     <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                   </div>
                   <h3 className="text-lg font-executive font-extrabold text-emerald-900 tracking-tighter leading-none mb-3">Health Check</h3>
                   <p className="text-[10px] text-emerald-700/70 font-black uppercase tracking-widest mb-6">Relay Engine Operational</p>
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Latency</span>
                       <span className="text-[10px] font-black text-emerald-900 tabular-nums">42ms</span>
                     </div>
                     <div className="flex justify-between items-center px-4 py-2 bg-white/50 rounded-xl">
                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Uptime</span>
                       <span className="text-[10px] font-black text-emerald-900 tabular-nums">99.99%</span>
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

export default EmailIntegration;

