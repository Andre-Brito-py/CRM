import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const GmailIntegration = () => {
  const router = useRouter();
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
      toast.success(`Gmail integration ${!enabled ? 'enabled' : 'disabled'} successfully`);
      mutate();
    } catch (error) {
      toast.error('Failed to update integration');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  return (
    <AccountLayout>
      <Meta title="Closify - Gmail Integration" />
      <Content.Title
        title="Gmail Integration"
        subtitle="Connect your Gmail account to sync emails and contacts"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Gmail"
            subtitle="Sync your emails directly into your CRM pipeline and contact records."
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-red-600 p-3 rounded-full text-white">
                <EnvelopeIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {enabled ? 'Connected' : 'Not Connected'}
                </h3>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? 'Your Gmail account is successfully connected.'
                    : 'Connect your account to start syncing emails.'}
                </p>
              </div>
            </div>

            {enabled && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Sync is active. Emails will appear in relevant contact timelines.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900">Features</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>Two-way email sync</li>
                <li>Automatic contact creation from new emails</li>
                <li>Email tracking (opens, clicks)</li>
                <li>Send emails directly from CRM</li>
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
                  ? 'Disconnect Gmail'
                  : 'Connect Gmail'}
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default GmailIntegration;
