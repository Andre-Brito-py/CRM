import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import { TrashIcon, PlusIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import Meta from '@/components/Meta/index';
import Button from '@/components/Button/index';
import api from '@/lib/common/api';

const ApiKeys = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data, error } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/api-keys` : null, api);
  
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addApiKey = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/api-keys`, {
        method: 'POST',
        body: { name },
      });
      
      if (response.apiKey) {
        toast.success('API Key created successfully');
        setName('');
        setIsAdding(false);
        mutate(`/api/workspace/${workspaceSlug}/api-keys`);
      } else {
        throw new Error(response.error || 'Failed to create API key');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteApiKey = async (id) => {
    if (!confirm('Are you sure you want to delete this API Key? It will stop working immediately.')) return;
    
    try {
      await api(`/api/workspace/${workspaceSlug}/api-keys/${id}`, {
        method: 'DELETE',
      });
      toast.success('API Key deleted');
      mutate(`/api/workspace/${workspaceSlug}/api-keys`);
    } catch (err) {
      toast.error('Failed to delete API Key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <AccountLayout>
      <Meta title={`API Keys - ${workspaceSlug}`} />
      <Content.Title title="API Keys" subtitle="Manage programmatic access to your workspace" />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title="Your API Keys" subtitle="Use these keys to authenticate API requests">
            <div className="mt-4">
              {data?.apiKeys?.length > 0 ? (
                <div className="space-y-4">
                  {data.apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{apiKey.name}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">
                            {apiKey.key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy to clipboard"
                          >
                            <ClipboardIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Revoke Key"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm font-medium">No API keys generated yet.</p>
              )}
            </div>
            
            {isAdding ? (
              <form onSubmit={addApiKey} className="mt-6 border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm px-3 py-2 border"
                      placeholder="e.g. Production Server, Zapier Integration"
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
                      className="bg-brand-600 text-white hover:bg-brand-700"
                    >
                      {isSubmitting ? 'Generating...' : 'Generate Key'}
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
                  Generate New Key
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default ApiKeys;
