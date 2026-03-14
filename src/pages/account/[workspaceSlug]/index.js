import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CreditCardIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import fetcher from '@/lib/client/fetcher';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="premium-card overflow-hidden Group">
    <div className="p-8">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-4 rounded-2xl bg-${color}-500/10 text-${color}-500 dark:text-${color}-400 shadow-sm border border-${color}-500/20`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="ml-6 w-0 flex-1">
          <dl>
            <dt className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] truncate mb-1">{title}</dt>
            <dd>
              <div className="text-3xl font-executive font-bold text-zinc-900 dark:text-white leading-tight">{value}</div>
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
      <div className="text-center text-zinc-400 dark:text-zinc-500 py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl mt-4">
        No recent activities found.
      </div>
    );
  }

  return (
    <div className="flow-root mt-6">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-100 dark:bg-zinc-800"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white dark:ring-zinc-900">
                    <UserGroupIcon className="h-4 w-4 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">
                        {activity.user?.name || 'System'}
                      </span>{' '}
                      {activity.type === 'DEAL_CREATED' ? 'created deal' : 'performed action'}{' '}
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">
                        {activity.deal?.name || activity.contact?.name || activity.title}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
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
      <div className="text-center text-zinc-400 dark:text-zinc-500 py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl mt-4">
        No upcoming tasks.
      </div>
    );
  }

  return (
    <div className="flow-root mt-6">
      <ul role="list" className="-mb-8">
        {tasks.map((task, idx) => (
          <li key={task.id}>
            <div className="relative pb-8">
              {idx !== tasks.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-zinc-900 ${task.priority === 'HIGH' ? 'bg-red-500 shadow-lg shadow-red-500/30' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-green-500 shadow-lg shadow-green-500/30'
                    }`}>
                    <span className="text-white text-[10px] font-bold px-2">T</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{task.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium">
                      {task.contact ? `Contact: ${task.contact.name}` : task.deal ? `Deal: ${task.deal.name}` : 'General Task'}
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="premium-card p-4 border-indigo-500/20 dark:bg-zinc-900 dark:border-zinc-800">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-bold text-indigo-500">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const Workspace = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { data: dashboardData, error } = useSWR(
    workspace ? `/api/workspace/${workspace.slug}/dashboard` : null,
    fetcher
  );

  const usage = dashboardData?.usage || null;
  const formatLimit = (value) => (value == null ? 'Ilimitado' : value);
  const formatBrl = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const stats = useMemo(() => [
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
        maximumFractionDigits: 0
      }).format(dashboardData?.stats?.revenue || 0),
      icon: CurrencyDollarIcon,
      color: 'indigo',
    },
    {
      title: 'Payments Paid',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }).format(dashboardData?.stats?.paymentsPaidAmount || 0),
      icon: CreditCardIcon,
      color: 'green',
    },
    {
      title: 'Payments Pending',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }).format(dashboardData?.stats?.paymentsPendingAmount || 0),
      icon: ClockIcon,
      color: 'yellow',
    },
    {
      title: 'NPS Score',
      value: dashboardData?.stats?.npsScore ?? 0,
      icon: ChartBarIcon,
      color: 'sky',
    },
    {
      title: 'NPS Responses',
      value: dashboardData?.stats?.npsResponses ?? 0,
      icon: UserGroupIcon,
      color: 'indigo',
    },
  ], [dashboardData]);

  const dashboardSteps = [
    {
      element: '#dashboard-stats',
      popover: {
        title: t('onboarding.tour.dashboard.step1.title'),
        description: t('onboarding.tour.dashboard.step1.desc'),
        position: 'bottom',
      }
    }
  ];

  return (
    workspace && (
      <AccountLayout>
        <OnboardingTour tourId="dashboard-tour" steps={dashboardSteps} />
        <Meta title={`Closify - ${workspace.name} | Dashboard`} />
        <Content.Title
          title={workspace.name}
          subtitle="Workspace Analytics and Performance"
          className="font-executive"
        />
        <Content.Divider />
        <Content.Container>
          <div id="dashboard-stats" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>

          {usage && (
            <div className="premium-card p-8 mb-8">
              <div className="flex items-center justify-between mb-6 border-b border-zinc-50 dark:border-zinc-800/50 pb-4">
                <h3 className="text-xl font-executive font-bold text-zinc-900 dark:text-white">
                  Uso e limites
                </h3>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">
                  Plano {usage.plan}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Membros
                  </div>
                  <div className="mt-2 text-2xl font-executive font-bold text-zinc-900 dark:text-white">
                    {usage.counts.membersAccepted}/{formatLimit(usage.limits.members)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Pendentes: {usage.counts.membersPending}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Webhooks
                  </div>
                  <div className="mt-2 text-2xl font-executive font-bold text-zinc-900 dark:text-white">
                    {usage.counts.webhooksActive}/{formatLimit(usage.limits.webhooks)}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Automações
                  </div>
                  <div className="mt-2 text-2xl font-executive font-bold text-zinc-900 dark:text-white">
                    {usage.counts.automationsActive}/{formatLimit(usage.limits.automations)}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Integrações WhatsApp
                  </div>
                  <div className="mt-2 text-2xl font-executive font-bold text-zinc-900 dark:text-white">
                    {usage.counts.whatsappIntegrations}/{formatLimit(usage.limits.whatsappIntegrations)}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    WhatsApp (30d)
                  </div>
                  <div className="mt-2 text-2xl font-executive font-bold text-zinc-900 dark:text-white">
                    {usage.counts.whatsappOutbound30d} out / {usage.counts.whatsappInbound30d} in
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Estimativa: {formatBrl(usage.estimatedCosts.whatsappOutbound30d)}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    IA e uploads (24h)
                  </div>
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 font-bold">
                    IA: {usage.counts.aiRequests24h}/{usage.limits.aiRequests24h}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 font-bold">
                    Uploads: {usage.counts.uploadRequests24h}/{usage.limits.uploads24h}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Estimativa: {formatBrl(usage.estimatedCosts.aiRequests24h + usage.estimatedCosts.uploadRequests24h)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="premium-card p-8 lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-executive font-bold text-zinc-900 dark:text-white">
                  Revenue Performance
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monthly Growth</span>
                </div>
              </div>

              <div className="h-[300px] w-full mt-4">
                {dashboardData?.salesData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.salesData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        hide
                        domain={[0, 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                    <ChartBarIcon className="w-10 h-10 text-zinc-200 dark:text-zinc-800 mb-4" />
                    <p className="text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest text-[10px]">No sales metrics yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8 lg:col-span-1">
              <div className="premium-card p-8">
                <div className="flex items-center justify-between mb-8 border-b border-zinc-50 dark:border-zinc-800/50 pb-4">
                  <h3 className="text-xl font-executive font-bold text-zinc-900 dark:text-white">
                    NPS
                  </h3>
                  <span className="px-3 py-1 bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">
                    Last 6 months
                  </span>
                </div>

                <div className="mb-8">
                  <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    NPS Score
                  </div>
                  <div className="mt-1 text-4xl font-executive font-bold text-zinc-900 dark:text-white leading-tight">
                    {dashboardData?.nps?.nps_score ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Total respostas: {dashboardData?.nps?.total_responses ?? 0}
                  </div>
                </div>

                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={`dash-nps-dist-${workspace?.id}`}
                      data={dashboardData?.nps?.distribution || []}
                      barCategoryGap={10}
                    >
                      <defs>
                        <linearGradient id="dashNpsDistBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="score" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="url(#dashNpsDistBar)"
                        radius={[10, 10, 0, 0]}
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[140px] w-full mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart key={`dash-nps-trend-${workspace?.id}`} data={dashboardData?.nps?.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={28} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="nps"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={false}
                        strokeLinecap="round"
                        isAnimationActive
                        animationDuration={1100}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="premium-card p-8 group">
                <h3 className="text-xl font-executive font-bold text-zinc-900 dark:text-white mb-2 border-b border-zinc-50 dark:border-zinc-800/50 pb-4">
                  Activity Feed
                </h3>
                <ActivityFeed activities={dashboardData?.recentActivities} />
              </div>
            </div>

            <div className="premium-card p-8 lg:col-span-3">
              <div className="flex items-center justify-between mb-8 border-b border-zinc-50 dark:border-zinc-800/50 pb-4">
                <h3 className="text-xl font-executive font-bold text-zinc-900 dark:text-white">
                  Action Center
                </h3>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">
                  Priority Tasks
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <UpcomingTasks tasks={dashboardData?.upcomingTasks} />
              </div>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    )
  );
};

export default Workspace;
