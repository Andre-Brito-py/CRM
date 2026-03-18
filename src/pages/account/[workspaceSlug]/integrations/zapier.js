import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { BoltIcon, CheckCircleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const ZapierIntegration = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data: session } = useSession();
  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/zapier` : null,
    fetcher
  );
  
  // Fetch API Key for display
  const { data: apiKeyData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/api-keys` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const isLoading = !data;
  const apiKey = apiKeyData?.data?.keys?.[0]?.key || 'No API Key found. Generate one in API Keys settings.';

  const toggleIntegration = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/zapier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      toast.success(`Zapier integration ${!enabled ? 'enabled' : 'disabled'} successfully`);
      mutate();
    } catch (error) {
      toast.error('Failed to update integration');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const copyToClipboard = () => toast.success('API Key copied to clipboard!');

  return (
    <AccountLayout>
      <Meta title="Closify - Zapier Integration" />
      <Content.Title
        title="Zapier Integration"
        subtitle="Automate your workflow with 5000+ apps"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Zapier"
            subtitle="Connect Closify to thousands of other apps with Zapier."
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-orange-500 p-3 rounded-full text-white">
                <BoltIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {enabled ? 'Active' : 'Inactive'}
                </h3>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? 'Zapier integration is active. Use your API Key to connect.'
                    : 'Enable Zapier to start automating your tasks.'}
                </p>
              </div>
            </div>

            {enabled && (
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        Integration enabled. You can now use Closify triggers and actions in Zapier.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your API Key for Zapier
                  </label>
                  <div className="flex rounded-md shadow-sm">
                    <input
                      type="text"
                      readOnly
                      value={apiKey}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-100 text-gray-500"
                    />
                    <CopyToClipboard text={apiKey} onCopy={copyToClipboard}>
                      <button
                        type="button"
                        className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        <span>Copy</span>
                      </button>
                    </CopyToClipboard>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Use this key when asked to authenticate Closify in Zapier.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900">Popular Zaps</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>Create Closify contacts from Google Forms</li>
                <li>Add new leads to Mailchimp</li>
                <li>Send Slack notifications for new deals</li>
                <li>Create Trello cards from tasks</li>
              </ul>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end">
              <Button
                className={`text-white ${
                  enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
                }`}
                disabled={isSubmitting || isLoading}
                onClick={toggleIntegration}
              >
                {isSubmitting
                  ? 'Processing...'
                  : enabled
                  ? 'Disable Integration'
                  : 'Enable Integration'}
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default ZapierIntegration;
