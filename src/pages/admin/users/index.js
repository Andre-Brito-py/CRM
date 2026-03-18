import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { UserIcon, EyeIcon, NoSymbolIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const Users = () => {
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR(session ? '/api/admin/users' : null, fetcher);
  const [impersonating, setImpersonating] = useState(null);
  const [processing, setProcessing] = useState(null);

  const users = data?.data?.users || [];
  const isLoading = !data && !error;

  const handleStatusChange = async (userId, suspended) => {
    setProcessing(userId);
    try {
      const response = await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended }),
      });

      if (response.error) {
        throw new Error(response.error.msg);
      }

      toast.success(suspended ? 'User suspended' : 'User reactivated');
      mutate();
    } catch (error) {
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    setProcessing(userId);
    try {
      const response = await api(`/api/admin/users/${userId}/status`, {
        method: 'DELETE',
      });

      if (response.error) {
        throw new Error(response.error.msg);
      }

      toast.success('User deleted');
      mutate();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setProcessing(null);
    }
  };

  const handleImpersonate = async (userId) => {
    setImpersonating(userId);
    try {
      const response = await api(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
      });

      if (response.error) {
        throw new Error(response.error.msg);
      }

      toast.success('Impersonating user...');
      window.location.href = '/account'; // Force reload to pick up new session
    } catch (error) {
      toast.error(error.message || 'Failed to impersonate user');
      setImpersonating(null);
    }
  };

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading users...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-600">
                  Failed to load users.
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No users found.</div>
              ) : (
                <ul role="list" className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {user.image ? (
                              <img className="h-10 w-10 rounded-full" src={user.image} alt="" />
                            ) : (
                              <UserIcon className="h-10 w-10 text-gray-400 p-2 bg-gray-100 rounded-full" />
                            )}
                            <div className="ml-4">
                              <p className="text-sm font-medium text-brand-600 truncate">{user.name || 'No Name'}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                            <div className="flex space-x-2">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.customerPayment?.subscriptionType === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' : user.customerPayment?.subscriptionType === 'STANDARD' ? 'bg-brand-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {user.customerPayment?.subscriptionType || 'FREE'}
                              </span>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                {user.role}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Joined {user.createdAt ? format(new Date(user.createdAt), 'PP') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between items-center">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Workspaces created: {user._count.createdWorkspace}
                            </p>
                          </div>
                          {user.role !== 'SUPERADMIN' && !user.deletedAt && (
                            <div className="flex space-x-2">
                              {user.suspended ? (
                                <button
                                  onClick={() => handleStatusChange(user.id, false)}
                                  disabled={processing === user.id}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  {processing === user.id ? '...' : (
                                    <>
                                      <ArrowPathIcon className="w-4 h-4 mr-1" /> Reactivate
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(user.id, true)}
                                  disabled={processing === user.id}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                >
                                  {processing === user.id ? '...' : (
                                    <>
                                      <NoSymbolIcon className="w-4 h-4 mr-1" /> Suspend
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(user.id)}
                                disabled={processing === user.id}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                {processing === user.id ? '...' : (
                                  <>
                                    <TrashIcon className="w-4 h-4 mr-1" /> Delete
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleImpersonate(user.id)}
                                disabled={impersonating === user.id}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-brand-700 bg-brand-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                              >
                                {impersonating === user.id ? 'Loading...' : (
                                  <>
                                    <EyeIcon className="w-4 h-4 mr-1" /> Impersonate
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {user.deletedAt && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Deleted
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Users;
