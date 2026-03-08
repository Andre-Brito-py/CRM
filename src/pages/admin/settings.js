import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  KeyIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import Meta from '@/components/Meta/index';

const ConfigItem = ({ config, onDelete }) => {
  const [showValue, setShowValue] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      setIsDeleting(true);
      await onDelete(config.key);
      setIsDeleting(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {config.key}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {showValue ? config.value : '••••••••••••••••'}
          </span>
          <button
            onClick={() => setShowValue(!showValue)}
            className="text-gray-400 hover:text-gray-600"
          >
            {showValue ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {config.category}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-900 disabled:opacity-50"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
};

const AdminSettings = () => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR(
    session ? '/api/admin/settings' : null,
    fetcher
  );

  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    category: 'GENERAL',
  });

  const configs = data?.data?.configs || [];

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      
      const result = await response.json();

      if (response.ok) {
        toast.success('Configuration saved successfully');
        setNewConfig({ key: '', value: '', category: 'GENERAL' });
        mutate('/api/admin/settings');
      } else {
        toast.error(result.error.msg || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (key) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (response.ok) {
        toast.success('Configuration deleted');
        mutate('/api/admin/settings');
      } else {
        const result = await response.json();
        toast.error(result.error.msg || 'Failed to delete configuration');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <AdminLayout>
      <Meta title="Nextacular - Admin Settings" />
      <Content.Title
        title="System Settings"
        subtitle="Manage system-wide API keys and configurations"
      />
      <Content.Divider />

      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <Card.Body title="Add New Config" subtitle="Add a new system-wide configuration">
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={newConfig.category}
                      onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                    >
                      <option value="GENERAL">General</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="EMAIL">Email</option>
                      <option value="AI">AI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. STRIPE_SECRET_KEY"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={newConfig.key}
                      onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use uppercase and underscores (e.g. API_KEY)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Value</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter value..."
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={newConfig.value}
                      onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isAdding ? 'Saving...' : 'Add Configuration'}
                  </button>
                </form>
              </Card.Body>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : configs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          No configurations found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      configs.map((config) => (
                        <ConfigItem 
                          key={config.id} 
                          config={config} 
                          onDelete={handleDelete} 
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default AdminSettings;
