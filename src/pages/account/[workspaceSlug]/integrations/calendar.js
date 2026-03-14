import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const CalendarIntegration = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data: session } = useSession();
  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/google_calendar` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const isLoading = !data;

  const toggleIntegration = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      toast.success(`Google Calendar integration ${!enabled ? 'enabled' : 'disabled'} successfully`);
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
      <Meta title="Closify - Google Calendar Integration" />
      <Content.Title
        title="Google Calendar Integration"
        subtitle="Sync your meetings and events"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Google Calendar"
            subtitle="Automatically sync meetings to your CRM tasks and activities."
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-red-500 p-3 rounded-full text-white">
                <CalendarIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {enabled ? 'Connected' : 'Not Connected'}
                </h3>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? 'Your Google Calendar is successfully connected.'
                    : 'Connect your calendar to sync events.'}
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
                      Sync is active. Upcoming meetings will appear in your tasks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900">Features</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>Two-way calendar sync</li>
                <li>Create meetings directly from Deals</li>
                <li>Automatic activity logging for completed meetings</li>
                <li>Availability sharing for booking</li>
              </ul>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end">
              <Button
                className={`text-white ${
                  enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isSubmitting || isLoading}
                onClick={toggleIntegration}
              >
                {isSubmitting
                  ? 'Processing...'
                  : enabled
                  ? 'Disconnect Calendar'
                  : 'Connect Calendar'}
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default CalendarIntegration;
