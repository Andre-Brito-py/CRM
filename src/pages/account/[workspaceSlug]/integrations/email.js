import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const EmailIntegration = () => {
  const router = useRouter();
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
      toast.success(`Email Inbox ${!enabled ? 'enabled' : 'disabled'} successfully`);
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
      toast.success('Copied');
    } catch (error) {
      toast.error('Copy failed');
      console.error(error);
    }
  };

  return (
    <AccountLayout>
      <Meta title="Closify - Email Inbox" />
      <Content.Title
        title="Email Inbox"
        subtitle="Receive inbound emails into your Inbox and reply from the CRM."
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Email Inbox"
            subtitle="Configure the inbound webhook and enable email conversations in your omnichannel Inbox."
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-sky-600 p-3 rounded-full text-white">
                <EnvelopeIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {enabled ? 'Enabled' : 'Disabled'}
                </h3>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? 'Inbound emails will create/update conversations in the Inbox.'
                    : 'Enable Email Inbox to start receiving emails.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Inbound URL</h4>
                  <Button
                    className="text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    disabled={!inboundUrl}
                    onClick={() => copyText(inboundUrl)}
                    type="button"
                  >
                    Copy
                  </Button>
                </div>
                <input
                  readOnly
                  value={inboundUrl}
                  className="mt-2 w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Inbound Token</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      className="text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      disabled={!inboundToken}
                      onClick={() => copyText(inboundToken)}
                      type="button"
                    >
                      Copy
                    </Button>
                    <Button
                      className="text-white bg-gray-800 hover:bg-gray-900 flex items-center gap-2"
                      disabled={isSubmitting || isLoading}
                      onClick={rotateToken}
                      type="button"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Rotate
                    </Button>
                  </div>
                </div>
                <input
                  readOnly
                  value={inboundToken}
                  className="mt-2 w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end">
              <Button
                className={`text-white ${enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
                  }`}
                disabled={isSubmitting || isLoading}
                onClick={toggleIntegration}
              >
                {isSubmitting
                  ? 'Processing...'
                  : enabled
                    ? 'Disable Email Inbox'
                    : 'Enable Email Inbox'}
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default EmailIntegration;

