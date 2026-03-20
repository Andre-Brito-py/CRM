import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import { UserGroupIcon, BuildingOfficeIcon, CreditCardIcon, ServerIcon, ArrowDownTrayIcon, CurrencyDollarIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 text-${color}-600`} aria-hidden="true" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { data: session } = useSession();
  const { data, error } = useSWR(session ? '/api/admin/stats' : null, fetcher);
  const { data: userData } = useSWR(session ? '/api/admin/users' : null, fetcher);
  const { data: profitsData } = useSWR(session ? '/api/admin/profits' : null, fetcher);

  const stats = data?.data || { users: 0, workspaces: 0, payments: 0, uptime: 0 };
  const profits = profitsData?.data || { mrr: 0, marketplaceFees: 0, aiOverages: 0, totalProfit: 0 };
  const users = userData?.data?.users || [];
  const isLoading = (!data && !error) || !profitsData;

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <Link
              href="/api/admin/export.csv"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" aria-hidden="true" />
              Export CSV
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="bg-gray-100 h-24 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <>
                <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Platform Revenue</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  <StatCard title="Total ARR (Approx)" value={formatCurrency(profits.mrr * 12)} icon={PresentationChartLineIcon} color="blue" />
                  <StatCard title="SaaS MRR" value={formatCurrency(profits.mrr)} icon={CurrencyDollarIcon} color="green" />
                  <StatCard title="Marketplace Fees" value={formatCurrency(profits.marketplaceFees)} icon={CreditCardIcon} color="indigo" />
                  <StatCard title="AI Overages" value={formatCurrency(profits.aiOverages)} icon={ServerIcon} color="purple" />
                </div>
                
                <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Platform Growth</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard title="Total Users" value={stats.users} icon={UserGroupIcon} color="blue" />
                  <StatCard title="Total Workspaces" value={stats.workspaces} icon={BuildingOfficeIcon} color="green" />
                  <StatCard title="Total Payments" value={stats.payments} icon={CreditCardIcon} color="purple" />
                  <StatCard title="System Uptime" value={formatUptime(stats.uptime)} icon={ServerIcon} color="gray" />
                </div>
              </>
            )}
          </div>
          <div className="py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Users</h2>
              <Link href="/admin/users" className="text-sm font-medium text-brand-600 hover:text-brand-500">
                View all
              </Link>
            </div>
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Plan
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.slice(0, 5).map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {user.image ? (
                                    <img className="h-10 w-10 rounded-full" src={user.image} alt="" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                      {user.name?.[0] || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{user.name || 'No Name'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.customerPayment?.subscriptionType === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' : user.customerPayment?.subscriptionType === 'STANDARD' ? 'bg-brand-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {user.customerPayment?.subscriptionType || 'FREE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.createdAt ? format(new Date(user.createdAt), 'PP') : '-'}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
