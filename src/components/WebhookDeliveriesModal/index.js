import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';
import { formatDistanceToNow } from 'date-fns';

const WebhookDeliveriesModal = ({ isOpen, toggle, slug, webhookId }) => {
  const { data, error, isLoading } = useSWR(
    isOpen && webhookId ? `/api/workspace/${slug}/webhooks/${webhookId}/deliveries` : null,
    api,
    { refreshInterval: isOpen ? 5000 : 0 } // Refresh every 5s while open
  );

  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} title="Webhook Deliveries" toggle={toggle}>
      <div className="w-[32rem] max-w-full space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <p className="text-sm text-gray-500 mb-4">
          Recent delivery attempts (last 50).
        </p>
        
        {isLoading && <p className="text-gray-500 text-sm">Loading deliveries...</p>}
        {error && <p className="text-red-500 text-sm">Failed to load deliveries.</p>}
        
        {data?.data?.deliveries?.length === 0 && !isLoading && (
          <p className="text-gray-500 text-sm p-4 bg-gray-50 border border-gray-100 rounded">No deliveries found yet.</p>
        )}

        <div className="space-y-3">
          {data?.data?.deliveries?.map(delivery => (
            <div key={delivery.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedId(expandedId === delivery.id ? null : delivery.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    delivery.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                    delivery.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {delivery.status}
                  </span>
                  <span className="text-sm font-medium">{delivery.event}</span>
                </div>
                <div className="text-right flex items-center gap-3">
                  {delivery.responseCode && (
                    <span className="text-xs text-gray-500 border border-gray-200 px-1 rounded">
                      {delivery.responseCode}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {expandedId === delivery.id && (
                <div className="p-3 bg-white border-t border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase">Payload</h4>
                      <pre className="mt-1 text-xs bg-gray-800 text-gray-200 p-2 rounded overflow-x-auto">
                        {JSON.stringify(delivery.payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase">Response Body</h4>
                      <pre className="mt-1 text-xs bg-gray-100 text-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {delivery.responseBody || 'No response body'}
                      </pre>
                    </div>
                    {delivery.status === 'FAILED' && (
                      <div className="pt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Attempts: {delivery.attempts}
                        </p>
                        <Button
                          type="button"
                          className="text-xs px-2 py-1 bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              toast.loading('Retrying...', { id: 'retry' });
                              const res = await api(`/api/workspace/${slug}/webhooks/${webhookId}/deliveries/${delivery.id}/retry`, {
                                method: 'POST',
                              });
                              if (res.data?.status === 'SUCCESS') {
                                toast.success('Retry successful', { id: 'retry' });
                              } else {
                                toast.error('Retry failed', { id: 'retry' });
                              }
                            } catch (err) {
                              toast.error('Failed to retry', { id: 'retry' });
                            }
                          }}
                        >
                          Retry Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end flex-shrink-0">
        <Button onClick={toggle} className="bg-white text-gray-700 border border-gray-300">
          Close
        </Button>
      </div>
    </Modal>
  );
};

export default WebhookDeliveriesModal;
