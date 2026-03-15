import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Modal from '@/components/Modal/index';
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
        <div className="flex items-center justify-center h-full">{t('common.loading')}</div>
      </AccountLayout>
    );
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/instagram?workspace=${workspaceSlug}`
    : '';

  return (
    <AccountLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('instagram.settings.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('instagram.settings.subtitle')}
            </p>
          </div>
          <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-premium" onClick={openNewModal}>
            <PlusIcon className="w-5 h-5 mr-2" /> {t('instagram.settings.addAccount')}
          </Button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-8">
          {integrations.length === 0 ? (
            <div className="text-center p-12 glass shadow-premium rounded-2xl border border-white/20">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-600">
                <ChatBubbleLeftRightIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{t('instagram.settings.empty.title')}</h3>
              <p className="mt-1 text-gray-500">{t('instagram.settings.empty.subtitle')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 text-xl">📸</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{integration.name}</h3>
                          <div className="flex items-center mt-1">
                            <span className={`w-2 h-2 rounded-full mr-2 ${integration.enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm text-gray-500">{integration.enabled ? t('common.status.active') : t('common.status.disabled')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => openEditModal(integration)} className="text-gray-400 hover:text-brand-600 transition">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(integration.id)} className="text-gray-400 hover:text-red-600 transition">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 truncate"><span className="font-medium text-gray-700">{t('instagram.settings.card.instagramId')}:</span> {integration.credentials?.instagramId}</p>
                      <p className="text-sm text-gray-500 mt-1"><span className="font-medium text-gray-700">{t('whatsapp.settings.card.added')}:</span> {new Date(integration.createdAt).toLocaleDateString(locale)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} toggle={() => setShowModal(false)}>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900 tracking-tight">{currentEditId ? t('common.action.edit') : t('instagram.settings.modal.connectTitle')}</h3>
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="flex items-start mb-6">
              <div className="flex items-center h-5">
                <input
                  id="enabled"
                  name="enabled"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={handleChange}
                  className="focus:ring-brand-500 h-4 w-4 text-brand-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="enabled" className="font-medium text-gray-700 cursor-pointer">
                  {t('whatsapp.settings.modal.enable')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('whatsapp.settings.modal.friendlyName')}</label>
              <input
                type="text"
                name="name"
                value={config.name}
                onChange={handleChange}
                placeholder={t('whatsapp.settings.modal.friendlyNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('whatsapp.settings.modal.webhookUrl')} <span className="text-xs text-gray-400 font-normal">({t('whatsapp.settings.modal.webhookHint')})</span></label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 focus:ring-brand-500 focus:border-brand-500 block w-full min-w-0 rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success(t('common.copied'));
                  }}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
                >
                  {t('common.action.copy')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('whatsapp.settings.modal.verifyToken')}</label>
              <input
                type="text"
                name="verifyToken"
                value={config.verifyToken}
                onChange={handleChange}
                placeholder={t('whatsapp.settings.modal.verifyTokenPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('instagram.settings.modal.pageId')}</label>
                <input
                  type="text"
                  name="pageId"
                  value={config.pageId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('instagram.settings.modal.instagramId')}</label>
                <input
                  type="text"
                  name="instagramId"
                  value={config.instagramId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('whatsapp.settings.modal.accessToken')}</label>
              <input
                type="password"
                name="accessToken"
                value={config.accessToken}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
              <Button type="button" className="text-gray-700 bg-gray-100 hover:bg-gray-200" onClick={() => setShowModal(false)}>{t('common.action.cancel')}</Button>
              <Button type="submit" className="text-white bg-brand-600 hover:bg-brand-700" disabled={isSaving}>
                {isSaving ? t('common.saving') : t('whatsapp.settings.modal.save')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </AccountLayout>
  );
};

export default InstagramSettings;
