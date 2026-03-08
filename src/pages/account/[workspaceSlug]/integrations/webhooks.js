import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import Meta from '@/components/Meta/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';

const Webhooks = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data, error } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/webhooks` : null, api);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState(['*']); // Default to all events
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addWebhook = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/webhooks`, {
        method: 'POST',
        body: { url: newUrl, events: newEvents },
      });
      
      if (response.webhook) {
        toast.success('Webhook added successfully');
        setNewUrl('');
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

  return (
    <AccountLayout>
      <Meta title={`Webhooks - ${workspaceSlug}`} />
      <Content.Title title="Webhooks" subtitle="Manage real-time event notifications" />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title="Your Webhooks" subtitle="Events will be sent to these URLs">
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
                        <p className="text-xs text-gray-400 font-mono mt-1">Secret: {webhook.secret}</p>
                      </div>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No webhooks configured yet.</p>
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      placeholder="https://api.yourapp.com/webhooks"
                    />
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
                      className="bg-blue-600 text-white hover:bg-blue-700"
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
                  className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default Webhooks;
