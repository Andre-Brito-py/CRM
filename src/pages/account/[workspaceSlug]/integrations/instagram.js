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
  CameraIcon,
  LinkIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import api from '@/lib/common/api';

const InstagramSettings = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { workspaceSlug } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentEditId, setCurrentEditId] = useState(null);

  const [config, setConfig] = useState({
    name: '',
    enabled: true,
    pageId: '',
    instagramId: '',
    accessToken: '',
    verifyToken: '',
  });

  const locale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    if (base === 'pt') return 'pt-BR';
    return base;
  }, [i18n?.language]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/integrations/instagram`, {
        method: 'GET',
      });
      if (response.data && response.data.integrations) {
        setIntegrations(response.data.integrations);
      }
    } catch (error) {
      toast.error('Failed to load Instagram integrations');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (workspaceSlug) {
      fetchIntegrations();
    }
  }, [fetchIntegrations, workspaceSlug]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentEditId) {
        await api(`/api/workspace/${workspaceSlug}/integrations/instagram/${currentEditId}`, {
          method: 'PUT',
          body: config,
        });
        toast.success('Instagram integration updated');
      } else {
        await api(`/api/workspace/${workspaceSlug}/integrations/instagram`, {
          method: 'POST',
          body: config,
        });
        toast.success('Instagram integration added');
      }

      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      toast.error(`${error?.error?.msg || 'Failed to save integration'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (integrationId) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      try {
        await api(`/api/workspace/${workspaceSlug}/integrations/instagram/${integrationId}`, {
          method: 'DELETE',
        });
        toast.success('Integration removed');
        fetchIntegrations();
      } catch (error) {
        toast.error('Failed to delete integration');
      }
    }
  };

  const openNewModal = () => {
    setCurrentEditId(null);
    setConfig({
      name: '',
      enabled: true,
      pageId: '',
      instagramId: '',
      accessToken: '',
      verifyToken: '',
    });
    setShowModal(true);
  };

  const openEditModal = (integration) => {
    setCurrentEditId(integration.id);
    setConfig({
      name: integration.name,
      enabled: integration.enabled,
      pageId: integration.credentials?.pageId || '',
      instagramId: integration.credentials?.instagramId || '',
      accessToken: integration.credentials?.accessToken || '',
      verifyToken: integration.credentials?.verifyToken || '',
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
    ? `${window.location.origin}/api/webhooks/instagram?workspace=${workspaceSlug}`
    : '';

  return (
    <AccountLayout>
      <div className="py-12 bg-[#fdfdfe] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-[14px] flex items-center justify-center shadow-glow-pink/30">
                <CameraIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-black text-pink-600 uppercase tracking-[0.2em]">{t('instagram.integration', 'Instagram Business')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 tracking-tighter leading-none mb-4">
              Instagram DM
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl leading-relaxed">
              {t('instagram.settings.subtitle')}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-premium hover:shadow-premium-lg transition-all" 
            onClick={openNewModal}
          >
            <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90" /> 
            {t('instagram.settings.addAccount')}
          </motion.button>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-zinc-100 shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-pink-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-4">How to connect</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[
                      { title: 'Meta Developers', desc: 'Create a Meta App with Messenger & Instagram permissions.', icon: LinkIcon, color: 'emerald' },
                      { title: 'Configure Webhook', desc: 'Point your Meta webhook to the URL provided in the connect modal.', icon: InformationCircleIcon, color: 'blue' },
                    ].map((step, i) => (
                      <div key={i} className="p-6 bg-zinc-50 rounded-[24px] border border-zinc-100 hover:border-zinc-200 transition-colors">
                        <div className={`w-10 h-10 rounded-xl bg-${step.color}-50 flex items-center justify-center mb-4`}>
                          <step.icon className={`w-5 h-5 text-${step.color}-500`} />
                        </div>
                        <h4 className="font-executive font-extrabold text-zinc-900 mb-2">{step.title}</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-10 flex items-center gap-4 p-5 bg-zinc-950 rounded-[24px] border border-zinc-800">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Integration Status</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight">System Ready for New Channels</span>
                  </div>
                  <div className="ml-auto">
                    <ArrowUpRightIcon className="w-5 h-5 text-zinc-700" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-[40px] p-10 text-white relative overflow-hidden shadow-premium flex flex-col items-center justify-center text-center">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white shadow-premium rounded-[32px] flex items-center justify-center mx-auto mb-8 animate-float">
                  <CameraIcon className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-3xl font-executive font-extrabold tracking-tighter mb-4">Omnichannel Master</h3>
                <p className="text-white/80 text-sm leading-relaxed font-medium mb-10 max-w-[240px] mx-auto">
                  Bring all your Instagram DM conversations into a single professional dashboard.
                </p>
                <div className="flex -space-x-3 justify-center">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-10">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter">Connected Accounts</h2>
              <div className="px-4 py-1.5 bg-zinc-100 rounded-full border border-zinc-200/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{integrations.length} Linked</span>
              </div>
            </div>

            {integrations.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[48px] border border-zinc-100 shadow-premium-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-grid-zinc-100/50 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-zinc-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-zinc-100 group-hover:scale-110 transition-transform duration-500">
                    <CameraIcon className="w-8 h-8 text-zinc-200" />
                  </div>
                  <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter mb-2">{t('instagram.settings.empty.title')}</h3>
                  <p className="text-zinc-400 font-medium max-w-sm mx-auto mb-10">{t('instagram.settings.empty.subtitle')}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openNewModal}
                    className="px-10 py-4 bg-zinc-950 text-white rounded-[22px] text-xs font-black uppercase tracking-widest shadow-premium"
                  >
                    Connect Instagram
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
                        <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center border transition-colors duration-500 ${integration.enabled ? 'bg-pink-50 border-pink-100' : 'bg-zinc-50 border-zinc-100'}`}>
                          <CameraIcon className={`w-7 h-7 ${integration.enabled ? 'text-pink-500' : 'text-zinc-400'}`} />
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
                    <div className="space-y-4 pt-6 mt-2 border-t border-zinc-50 relative z-10 text-center md:text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-[100px]">{t('instagram.settings.card.instagramId')}</span>
                        <span className="text-xs font-black text-zinc-900 tabular-nums truncate max-w-[140px]">{integration.credentials?.instagramId}</span>
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
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                  
                  <div className="bg-white px-8 pb-8 pt-10 relative z-10">
                    <div className="sm:flex sm:items-start mb-8">
                      <div className="mx-auto flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] bg-pink-50 sm:mx-0 border border-pink-100 shadow-glow-pink/10">
                        <CameraIcon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                      </div>
                      <div className="mt-3 text-center sm:ml-6 sm:mt-0 sm:text-left">
                        <Dialog.Title as="h3" className="text-2xl font-executive font-extrabold leading-none text-zinc-950 tracking-tighter mb-2">
                          {currentEditId ? t('common.action.edit') : t('instagram.settings.modal.connectTitle')}
                        </Dialog.Title>
                        <p className="text-sm text-zinc-400 font-medium">
                          {t('instagram.settings.modal.subtitle', 'Configure your Instagram Graph API credentials below.')}
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
                            className="h-5 w-5 rounded-lg border-zinc-300 text-pink-600 focus:ring-pink-500 transition-all cursor-pointer"
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
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">
                          {t('whatsapp.settings.modal.webhookUrl')} 
                        </label>
                        <div className="flex gap-2">
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
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('instagram.settings.modal.pageId')}</label>
                          <input
                            type="text"
                            name="pageId"
                            value={config.pageId}
                            onChange={handleChange}
                            className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300 text-center tabular-nums font-black"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-3">{t('instagram.settings.modal.instagramId')}</label>
                          <input
                            type="text"
                            name="instagramId"
                            value={config.instagramId}
                            onChange={handleChange}
                            className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300 text-center tabular-nums font-black"
                            required
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
                          className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 transition-all font-medium text-zinc-950 placeholder:text-zinc-300"
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

export default InstagramSettings;
