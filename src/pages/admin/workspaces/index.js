import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const Workspaces = () => {
  const { data: session } = useSession();
  const { data, error } = useSWR(session ? '/api/admin/workspaces' : null, fetcher);

  const workspaces = data?.data?.workspaces || [];
  const isLoading = !data && !error;

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading workspaces...</div>
              ) : workspaces.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No workspaces found.</div>
              ) : (
                <ul role="list" className="divide-y divide-gray-200">
                  {workspaces.map((workspace) => (
                    <li key={workspace.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-10 w-10 text-gray-400 p-2 bg-gray-100 rounded-full" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-blue-600 truncate">{workspace.name}</p>
                              <p className="text-sm text-gray-500">/{workspace.slug}</p>
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {workspace._count.members} Members
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Created {workspace.createdAt ? format(new Date(workspace.createdAt), 'PP') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Creator: {workspace.creator.name || workspace.creator.email} ({workspace.creator.email})
                            </p>
                          </div>
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

export default Workspaces;
