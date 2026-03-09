import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import fetcher from '@/lib/client/fetcher';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass overflow-hidden rounded-2xl">
    <div className="p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 uppercase tracking-wider truncate">{title}</dt>
            <dd>
              <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const ActivityFeed = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No recent activities found.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                    <UserGroupIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {activity.user?.name || 'System'}
                      </span>{' '}
                      {activity.type === 'DEAL_CREATED' ? 'created deal' : 'performed action'}{' '}
                      <span className="font-medium text-gray-900">
                        {activity.deal?.name || activity.contact?.name || activity.title}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={activity.createdAt}>
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const UpcomingTasks = ({ tasks }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No upcoming tasks.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {tasks.map((task, idx) => (
          <li key={task.id}>
            <div className="relative pb-8">
              {idx !== tasks.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${task.priority === 'HIGH' ? 'bg-red-500' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}>
                    <span className="text-white text-xs font-bold">T</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">
                      {task.contact ? `Contact: ${task.contact.name}` : task.deal ? `Deal: ${task.deal.name}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Workspace = () => {
  const { workspace } = useWorkspace();
  const { data: dashboardData, error } = useSWR(
    workspace ? `/api/workspace/${workspace.slug}/dashboard` : null,
    fetcher
  );

  const stats = [
    {
      title: 'Total Contacts',
      value: dashboardData?.stats?.contacts || 0,
      icon: UserGroupIcon,
      color: 'blue',
    },
    {
      title: 'Open Deals',
      value: dashboardData?.stats?.openDeals || 0,
      icon: BriefcaseIcon,
      color: 'yellow',
    },
    {
      title: 'Won Deals',
      value: dashboardData?.stats?.wonDeals || 0,
      icon: ChartBarIcon,
      color: 'green',
    },
    {
      title: 'Revenue',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(dashboardData?.stats?.revenue || 0),
      icon: CurrencyDollarIcon,
      color: 'green',
    },
  ];

  return (
    workspace && (
      <AccountLayout>
        <Meta title={`Nextacular - ${workspace.name} | Dashboard`} />
        <Content.Title
          title={workspace.name}
          subtitle="Overview of your workspace performance"
        />
        <Content.Divider />
        <Content.Container>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="glass shadow-premium rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
              <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6">
                Upcoming Tasks
              </h3>
              <UpcomingTasks tasks={dashboardData?.upcomingTasks} />
            </div>

            <div className="glass shadow-premium rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 -mb-4 -mr-4 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
              <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6">
                Recent Activity
              </h3>
              <ActivityFeed activities={dashboardData?.recentActivities} />
            </div>

            <div className="glass shadow-premium rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 -mt-10 -ml-10 w-40 h-40 bg-green-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
              <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6">
                Sales Performance (Last 6 Months)
              </h3>
              {/* Simple Bar Chart Placeholder */}
              {dashboardData?.salesData?.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {dashboardData.salesData.map((data) => (
                    <div key={data.name} className="flex items-center Group">
                      <span className="w-12 text-sm font-medium text-gray-600">{data.name}</span>
                      <div className="flex-1 ml-3 bg-gray-100/50 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-brand-400 to-brand-600 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${Math.min((data.value / (Math.max(...dashboardData.salesData.map(d => d.value)) || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-semibold text-gray-700 w-20 text-right">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0
                        }).format(data.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No sales data available yet.</p>
              )}
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    )
  );
};

export default Workspace;
