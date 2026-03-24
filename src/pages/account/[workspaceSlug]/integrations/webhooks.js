import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import { ArrowPathIcon, TrashIcon, PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import Meta from '@/components/Meta/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';
import WebhookDeliveriesModal from '@/components/WebhookDeliveriesModal';

const Webhooks = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data, error } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/webhooks` : null, api);

  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEventsText, setNewEventsText] = useState('*');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewDeliveriesId, setViewDeliveriesId] = useState(null);

  const maskSecret = (secret) => {
    if (!secret) return '';
    if (secret.length <= 10) return secret;
    return `${secret.slice(0, 6)}…${secret.slice(-4)}`;
  };

  const parseEvents = (value) => {
    const raw = (value || '').trim();
    if (!raw) return ['*'];
    const events = raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    return events.length > 0 ? events : ['*'];
  };

  const addWebhook = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api(`/api/workspace/${workspaceSlug}/webhooks`, {
        method: 'POST',
        body: { url: newUrl, events: parseEvents(newEventsText) },
      });

      if (response.webhook) {
        toast.success('Webhook added successfully');
        window.prompt('Webhook secret (copy now):', response.webhook.secret || '');
        setNewUrl('');
        setNewEventsText('*');
        setIsAdding(false);
        mutate(`/api/workspace/${workspaceSlug}/webhooks`);
      } else {
        throw new Error(response.error || 'Failed to add webhook');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWebhook = async (id) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/webhooks/${id}`, {
        method: 'DELETE',
      });
      toast.success('Webhook deleted');
      mutate(`/api/workspace/${workspaceSlug}/webhooks`);
    } catch (err) {
      toast.error('Failed to delete webhook');
    }
  };

  const rotateSecret = async (id) => {
    if (!confirm('Rotate this webhook secret? Existing signatures will stop working.')) return;

    try {
      const response = await api(`/api/workspace/${workspaceSlug}/webhooks/${id}`, {
        method: 'PATCH',
        body: { action: 'ROTATE_SECRET' },
      });

      if (response.webhook?.secret) {
        window.prompt('New webhook secret (copy now):', response.webhook.secret);
        toast.success('Webhook secret rotated');
        mutate(`/api/workspace/${workspaceSlug}/webhooks`);
      } else {
        throw new Error(response.error || 'Failed to rotate secret');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to rotate secret');
    }
  };

  return (
    <AccountLayout>
      <Meta title={`Webhooks - ${workspaceSlug}`} />
      <Content.Title title="Webhooks" subtitle="Manage real-time event notifications" />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title="Your Webhooks" subtitle="Events will be sent to these URLs">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              <div className="font-semibold">Zapier</div>
              <div className="mt-1 text-indigo-800">
                Use um <span className="font-mono">Catch Hook</span> do Zapier para receber eventos do Vysify e conectar com apps externos.
              </div>
              <div className="mt-3">
                <Button
                  onClick={() => {
                    setNewEventsText('*');
                    setIsAdding(true);
                  }}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Conectar Zapier
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {data?.webhooks?.length > 0 ? (
                <div className="space-y-4">
                  {data.webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900 break-all">{webhook.url}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Events: {Array.isArray(webhook.events) ? webhook.events.join(', ') : webhook.events}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">Secret: {maskSecret(webhook.secret)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewDeliveriesId(webhook.id)}
                          className="text-brand-600 hover:text-blue-800 p-2"
                          aria-label="View deliveries"
                          title="View Deliveries"
                        >
                          <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => rotateSecret(webhook.id)}
                          className="text-gray-600 hover:text-gray-800 p-2"
                          aria-label="Rotate secret"
                          title="Rotate Secret"
                        >
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteWebhook(webhook.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          aria-label="Delete webhook"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm font-medium">No webhooks configured yet.</p>
              )}
            </div>

            {isAdding ? (
              <form onSubmit={addWebhook} className="mt-6 border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint URL</label>
                    <input
                      type="url"
                      required
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2 border"
                      placeholder="https://api.yourapp.com/webhooks"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Events</label>
                    <input
                      type="text"
                      value={newEventsText}
                      onChange={(e) => setNewEventsText(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2 border"
                      placeholder="*, INCOMING_MESSAGE, DEAL_STAGE_CHANGED"
                    />
                    <p className="mt-1 text-xs text-gray-500">Comma-separated. Use * to receive all events.</p>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      onClick={() => setIsAdding(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-brand-600 text-white hover:bg-brand-700"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Webhook'}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-6">
                <Button
                  onClick={() => setIsAdding(true)}
                  className="bg-white text-brand-600 border border-brand-600 hover:bg-brand-50 flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Content.Container>

      <WebhookDeliveriesModal
        isOpen={!!viewDeliveriesId}
        toggle={() => setViewDeliveriesId(null)}
        slug={workspaceSlug}
        webhookId={viewDeliveriesId}
      />
    </AccountLayout>
  );
};

export default Webhooks;
