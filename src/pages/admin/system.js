import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { CheckCircleIcon, XCircleIcon, CpuChipIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import formatDistance from 'date-fns/formatDistance';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const System = () => {
  const { data: session } = useSession();
  const { data } = useSWR(session ? '/api/admin/system/health' : null, fetcher, {
    refreshInterval: 5000,
  });

  const health = data?.data;
  const isLoading = !data;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">System Health</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading system status...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Database Status */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {health.dbStatus === 'connected' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Database Status</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 capitalize">{health.dbStatus}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Latency: {health.dbLatency}ms
                  </div>
                </div>
              </div>

              {/* Uptime */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">System Uptime</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{formatUptime(health.uptime)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Node: {health.nodeVersion} on {health.platform}
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CpuChipIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Memory Usage</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{formatBytes(health.memory.rss)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Heap Used: {formatBytes(health.memory.heapUsed)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Raw Stats</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed system information.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">CPU Load Average (1m, 5m, 15m)</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {health.cpu.map(l => l.toFixed(2)).join(', ')}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(health.timestamp).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default System;
