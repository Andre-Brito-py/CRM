import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
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
  const { data, mutate } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/google_calendar` : null,
    fetcher
  );

  const [isSubmitting, setSubmittingState] = useState(false);
  const enabled = data?.data?.enabled || false;
  const connected = data?.data?.connected || false;
  const isLoading = !data;
  const calendars = useMemo(() => data?.data?.calendars || [], [data?.data?.calendars]);
  const connectedEmail = data?.data?.connectedEmail || '';
  const scope = data?.data?.scope || '';
  const expiresAt = data?.data?.expiresAt || null;

  const [calendarId, setCalendarId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [windowDays, setWindowDays] = useState(7);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (!data?.data) return;
    setCalendarId(data.data.calendarId || '');
    setTimezone(data.data.timezone || '');
    setDurationMinutes(Number(data.data.durationMinutes || 30));
    setWindowDays(Number(data.data.windowDays || 7));
  }, [data?.data]);

  const handleDisconnect = async () => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      toast.success('Google Calendar disconnected');
      setAvailability(null);
      mutate();
    } catch (error) {
      toast.error('Failed to disconnect');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const handleConnect = () => {
    if (!workspaceSlug) return;
    window.location.href = `/api/workspace/${workspaceSlug}/integrations/google_calendar/connect`;
  };

  const saveConfig = async (next = {}) => {
    setSubmittingState(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: next.calendarId ?? calendarId,
          timezone: next.timezone ?? timezone,
          durationMinutes: next.durationMinutes ?? durationMinutes,
          windowDays: next.windowDays ?? windowDays,
        }),
      });
      toast.success('Settings saved');
      mutate();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const testAvailability = async () => {
    setSubmittingState(true);
    setAvailability(null);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar/freebusy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: calendarId || undefined,
          durationMinutes,
          windowDays,
          maxSuggestions: 5,
        }),
      });
      if (res?.data) setAvailability(res.data);
      toast.success('Availability checked');
    } catch (error) {
      toast.error('Failed to check availability');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  const selectedCalendar = useMemo(() => calendars.find((c) => c.id === calendarId) || null, [calendars, calendarId]);

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
                  {connected ? 'Connected' : 'Not Connected'}
                </h3>
                <p className="text-sm text-gray-500">
                  {connected ? 'Your Google Calendar is connected for this workspace.' : 'Connect your calendar to check availability.'}
                </p>
              </div>
            </div>

            {connected && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Integration is active. You can configure default calendar and test free/busy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {connected && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">Healthcheck</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Status: {enabled ? 'Enabled' : 'Disabled'}</div>
                    {connectedEmail ? <div>Account: {connectedEmail}</div> : null}
                    {scope ? <div>Scopes: {scope}</div> : null}
                    {expiresAt ? <div>Token expires: {new Date(Number(expiresAt) * 1000).toLocaleString()}</div> : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Default calendar</div>
                    <select
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting || isLoading}
                    >
                      <option value="" disabled>Select a calendar</option>
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.primary ? `${c.summary} (Primary)` : c.summary}
                        </option>
                      ))}
                    </select>
                    {selectedCalendar?.timeZone && (
                      <div className="mt-1 text-xs text-gray-500">Calendar timezone: {selectedCalendar.timeZone}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Timezone</div>
                    <input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. America/Sao_Paulo"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting || isLoading}
                    />
                    <div className="mt-1 text-xs text-gray-500">Optional. If empty, uses calendar default.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Meeting duration (minutes)</div>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value || 0))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting || isLoading}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Availability window (days)</div>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={windowDays}
                      onChange={(e) => setWindowDays(Number(e.target.value || 0))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting || isLoading}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="text-white bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting || isLoading || !calendarId}
                    onClick={() => saveConfig({})}
                  >
                    Save settings
                  </Button>
                  <Button
                    className="text-white bg-gray-900 hover:bg-gray-800"
                    disabled={isSubmitting || isLoading || !calendarId}
                    onClick={testAvailability}
                  >
                    Test free/busy
                  </Button>
                </div>

                {availability?.suggestions?.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-medium text-gray-900 mb-2">Suggested time slots</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {availability.suggestions.map((s) => (
                        <li key={s.start}>
                          {new Date(s.start).toLocaleString()} → {new Date(s.end).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs text-gray-500">
                      Busy blocks in window: {availability.busyCount}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900">Features</h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>Availability sharing for booking</li>
                <li>Read calendars and free/busy</li>
                <li>Workspace-level default calendar</li>
              </ul>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end">
              <Button
                className={`text-white ${connected ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                disabled={isSubmitting || isLoading}
                onClick={connected ? handleDisconnect : handleConnect}
              >
                {isSubmitting
                  ? 'Processing...'
                  : connected
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
