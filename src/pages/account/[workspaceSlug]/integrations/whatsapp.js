import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

import AccountLayout from '@/layouts/AccountLayout';
import api from '@/lib/common/api';

const WhatsAppSettings = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
    businessAccountId: '',
  });

  useEffect(() => {
    if (workspaceSlug) {
      fetchConfig();
    }
  }, [workspaceSlug]);

  const fetchConfig = async () => {
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp`, {
        method: 'GET',
      });
      if (response.data && response.data.integration) {
        const { enabled, credentials } = response.data.integration;
        setConfig({
          enabled,
          phoneNumberId: credentials.phoneNumberId || '',
          accessToken: credentials.accessToken || '',
          verifyToken: credentials.verifyToken || '',
          businessAccountId: credentials.businessAccountId || '',
        });
      }
    } catch (error) {
      toast.error('Failed to load WhatsApp settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/whatsapp`, {
        method: 'POST',
        body: config,
      });
      toast.success('WhatsApp settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex items-center justify-center h-full">Loading...</div>
      </AccountLayout>
    );
  }

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/integrations/whatsapp/webhook?workspace=${workspaceSlug}`
    : '';

  return (
    <AccountLayout>
      <div className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Cloud API</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure your Meta WhatsApp Cloud API credentials.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="enabled"
                  name="enabled"
                  type="checkbox"
                  checked={config.enabled}
                  onChange={handleChange}
                  className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="enabled" className="font-medium text-gray-700">
                  Enable WhatsApp Integration
                </label>
                <p className="text-gray-500">Turn on to start receiving and sending messages.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="webhookUrl"
                    id="webhookUrl"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 focus:ring-green-500 focus:border-green-500 block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success('Copied to clipboard');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 sm:text-sm hover:bg-gray-100"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Paste this URL in your Meta App Dashboard &gt; WhatsApp &gt; Configuration.
                </p>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="verifyToken" className="block text-sm font-medium text-gray-700">
                  Verify Token
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="verifyToken"
                    id="verifyToken"
                    value={config.verifyToken}
                    onChange={handleChange}
                    placeholder="Create a secret token (e.g. random string)"
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Use this token when verifying the Webhook in Meta Dashboard.
                </p>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-700">
                  Phone Number ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="phoneNumberId"
                    id="phoneNumberId"
                    value={config.phoneNumberId}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="businessAccountId" className="block text-sm font-medium text-gray-700">
                  WhatsApp Business Account ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="businessAccountId"
                    id="businessAccountId"
                    value={config.businessAccountId}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
                  Access Token (Permanent)
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="accessToken"
                    id="accessToken"
                    value={config.accessToken}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  System User Access Token with `whatsapp_business_management` and `whatsapp_business_messaging` permissions.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AccountLayout>
  );
};

export default WhatsAppSettings;
