import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CreditCardIcon,
  ClockIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import GlowingAreaChart from '@/components/Charts/GlowingAreaChart';
import NeonBarChart from '@/components/Charts/NeonBarChart';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import fetcher from '@/lib/client/fetcher';

const StatCard = ({ title, value, icon: Icon, color, index }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.8, ease: "easeOut" }}
    className="vysify-glass p-10 rounded-[2.5rem] group relative overflow-hidden transition-all duration-700 hover:border-indigo-500/40 hover:-translate-y-2 hover:shadow-3xl ring-1 ring-zinc-800/10"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-700" />
    <div className="flex items-center justify-between">
      <div className="flex flex-col min-w-0">
        <dt className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] truncate mb-2.5 italic">{title}</dt>
        <dd>
          <div className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white leading-none tracking-tighter italic uppercase">{value}</div>
        </dd>
      </div>
      <div className={`flex-shrink-0 p-5 rounded-[1.75rem] bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 shadow-premium border border-${color}-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
        <Icon className="h-7 w-7 stroke-[2]" aria-hidden="true" />
      </div>
    </div>
  </motion.div>
);

const ActivityFeed = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] mt-6 group/empty">
        <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 opacity-40 group-hover/empty:opacity-100 transition-all duration-1000">
           <ClockIcon className="w-8 h-8 text-zinc-300" />
        </div>
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">No Recent Transmissions</p>
      </div>
    );
  }

  return (
    <div className="flow-root mt-10 px-4">
      <ul role="list" className="-mb-10">
        {activities.map((activity, activityIdx) => (
          <motion.li 
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: activityIdx * 0.08, duration: 0.6 }}
          >
            <div className="relative pb-12">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-5 left-6 -ml-px h-full w-0.5 bg-gradient-to-b from-zinc-200 via-zinc-100 to-transparent dark:from-zinc-800 dark:via-zinc-900 dark:to-transparent"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-6 items-start">
                <div className="relative">
                  <div className="h-12 w-12 rounded-[1.25rem] bg-zinc-950 dark:bg-zinc-900 flex items-center justify-center ring-8 ring-white dark:ring-black shadow-3xl shadow-indigo-500/10 transition-transform hover:scale-110">
                    <UserGroupIcon className="h-5 w-5 text-indigo-400 stroke-[2]" aria-hidden="true" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-black" />
                </div>
                <div className="min-w-0 flex-1 pt-2 flex justify-between space-x-6">
                  <div>
                    <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed italic">
                      <span className="text-zinc-950 dark:text-zinc-100 font-executive font-black uppercase tracking-tight">
                        {activity.user?.name || 'Vysify System'}
                      </span>{' '}
                      <span className="opacity-70">{activity.type === 'DEAL_CREATED' ? 'initiated deal protocol for' : 'executed core action on'}</span>{' '}
                      <span className="text-zinc-950 dark:text-zinc-100 font-executive font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400">
                        {activity.deal?.name || activity.contact?.name || activity.title}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 pt-1 shrink-0 italic tabular-nums">
                    <time dateTime={activity.createdAt}>
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

const UpcomingTasks = ({ tasks }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] mt-6 w-full opacity-40 italic">
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em]">No Pending Protocols</p>
      </div>
    );
  }

  return (
    <div className="flow-root mt-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tasks.map((task, idx) => (
          <motion.div 
            key={task.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className="p-8 bg-white/40 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] hover:bg-white dark:hover:bg-zinc-900 transition-all group shadow-premium hover:shadow-3xl"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center shadow-premium transition-transform group-hover:scale-110 group-hover:rotate-6 ${
                  task.priority === 'HIGH' ? 'bg-rose-500 shadow-rose-500/20' :
                  task.priority === 'MEDIUM' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
                }`}>
                  <span className="text-white text-lg font-black italic">!</span>
                </div>
                <div className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-inner italic">
                  PROTO {new Date(task.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-executive font-extrabold text-zinc-950 dark:text-zinc-100 italic uppercase tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</p>
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                   <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.2em] italic">
                    {task.contact ? `Client: ${task.contact.name}` : task.deal ? `Deal: ${task.deal.name}` : 'General Operation'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};



const Workspace = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { data: dashboardData, error } = useSWR(
    workspace ? `/api/workspace/${workspace.slug}/dashboard` : null,
    fetcher
  );

  const isOwner = dashboardData?.permissions?.isOwner === true;
  const usage = dashboardData?.usage || null;
  const formatLimit = (value) => (value == null ? '∞' : value);
  const formatBrl = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const stats = useMemo(() => {
    const base = [
      {
        title: 'Contatos Totais',
        value: dashboardData?.stats?.contacts || 0,
        icon: UserGroupIcon,
        color: 'blue',
      },
      {
        title: 'Negócios Abertos',
        value: dashboardData?.stats?.openDeals || 0,
        icon: BriefcaseIcon,
        color: 'amber',
      },
      {
        title: 'Negócios Ganhos',
        value: dashboardData?.stats?.wonDeals || 0,
        icon: ChartBarIcon,
        color: 'emerald',
      },
      {
        title: 'Pontuação NPS',
        value: dashboardData?.stats?.npsScore ?? 0,
        icon: FaceSmileIcon,
        color: 'sky',
      },
      {
        title: 'Respostas NPS',
        value: dashboardData?.stats?.npsResponses ?? 0,
        icon: UserGroupIcon,
        color: 'indigo',
      },
    ];

    if (!isOwner) return base;

    return [
      ...base.slice(0, 3),
      {
        title: 'Receita Total',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(dashboardData?.stats?.revenue || 0),
        icon: CurrencyDollarIcon,
        color: 'indigo',
      },
      {
        title: 'Ticket Médio',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(dashboardData?.stats?.averageTicket || 0),
        icon: ChartBarIcon,
        color: 'blue',
      },
      {
        title: 'Pagos',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(dashboardData?.stats?.paymentsPaidAmount || 0),
        icon: CreditCardIcon,
        color: 'emerald',
      },
      {
        title: 'Pendentes',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(dashboardData?.stats?.paymentsPendingAmount || 0),
        icon: ClockIcon,
        color: 'amber',
      },
      ...base.slice(3),
    ];
  }, [dashboardData, isOwner]);

  const dashboardSteps = [
    {
      element: '#dashboard-stats',
      popover: {
        title: t('onboarding.tour.dashboard.step1.title'),
        description: t('onboarding.tour.dashboard.step1.desc'),
        position: 'bottom',
      },
    },
    isOwner
      ? {
        element: '#usage-section',
        popover: {
          title: 'Uso e Limites',
          description: 'Monitore aqui quantos membros, webhooks e IA você ainda tem disponíveis no mês.',
          position: 'top',
        },
      }
      : null,
    {
      element: '#nps-section',
      popover: {
        title: 'Voz do Cliente (NPS)',
        description: 'Veja como está a satisfação dos seus clientes com base nas pesquisas enviadas.',
        position: 'left',
      },
    },
  ].filter(Boolean);

  if (!workspace) {
    return (
      <AccountLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-100 dark:border-zinc-800 border-t-indigo-600 rounded-full animate-spin shadow-2xl shadow-indigo-500/20"></div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <OnboardingTour tourId="dashboard-tour" steps={dashboardSteps} />
        <Meta title={`Vysify - ${workspace.name} | Dashboard`} />
        
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mb-12"
        >
          <Content.Title
            title={workspace.name}
            subtitle="Analytics de Performance e Métricas do Workspace"
            className="font-black text-4xl uppercase italic tracking-tighter"
          />
        </motion.div>

        <Content.Container>
          <div id="dashboard-stats" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            {stats.map((item, index) => (
              <StatCard key={item.title} {...item} index={index} />
            ))}
          </div>

          <AnimatePresence>
            {usage && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                id="usage-section" 
                className="vysify-glass p-10 mb-12 rounded-[2.5rem] relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-10 border-b border-zinc-50 dark:border-zinc-800/50 pb-6">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                    CAPACIDADE OPERACIONAL
                  </h3>
                  <span className="px-5 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 italic">
                    PLANO {usage.plan}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { label: 'Membros', value: `${usage.counts.membersAccepted}/${formatLimit(usage.limits.members)}`, sub: `Pendentes: ${usage.counts.membersPending}` },
                    { label: 'Webhooks', value: `${usage.counts.webhooksActive}/${formatLimit(usage.limits.webhooks)}` },
                    { label: 'Automações', value: `${usage.counts.automationsActive}/${formatLimit(usage.limits.automations)}` },
                    { label: 'Integr. WhatsApp', value: `${usage.counts.whatsappIntegrations}/${formatLimit(usage.limits.whatsappIntegrations)}` },
                    { label: 'WhatsApp (30d)', value: `${usage.counts.whatsappOutbound30d} out / ${usage.counts.whatsappInbound30d} in`, sub: `Estimativa: ${formatBrl(usage.estimatedCosts.whatsappOutbound30d)}` },
                    { label: 'IA & Uploads (24h)', value: `IA: ${usage.counts.aiRequests24h}/${usage.limits.aiRequests24h}`, sub: `Uploads: ${usage.counts.uploadRequests24h}/${usage.limits.uploads24h}` },
                  ].map((u, i) => (
                    <motion.div 
                      key={u.label} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800 transition-all"
                    >
                      <div className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2 font-display">
                        {u.label}
                      </div>
                      <div className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight mb-2">
                        {u.value}
                      </div>
                      {u.sub && (
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest italic opacity-70">
                          {u.sub}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {isOwner && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                id="revenue-chart" 
                className="vysify-glass p-10 lg:col-span-2 rounded-[2.5rem] relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                    PERFORMANCE DE RECEITA
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em]">CRESCIMENTO MENSAL</span>
                  </div>
                </div>

                <div className="h-[350px] w-full mt-4">
                  {dashboardData?.salesData?.length > 0 ? (
                    <GlowingAreaChart
                       data={dashboardData.salesData}
                       xKey="date"
                       yKey="value"
                       color="#6366f1"
                       formatYAxis={(val) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(val)}
                       formatTooltipValue={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem]">
                      <ChartBarIcon className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-6" />
                      <p className="text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-[0.25em] text-[10px]">Sem métricas de venda</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className={`space-y-10 ${isOwner ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                id="nps-section" 
                className="vysify-glass p-10 rounded-[2.5rem]"
              >
                <div className="flex items-center justify-between mb-8 border-b border-zinc-50 dark:border-zinc-800/50 pb-6">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                    NPS
                  </h3>
                  <span className="px-4 py-1.5 bg-sky-500/10 text-sky-500 text-[9px] font-black rounded-xl uppercase tracking-widest italic border border-sky-500/20">
                    SÉRIE 6M
                  </span>
                </div>

                <div className="mb-10">
                  <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] mb-2 font-display">
                    NPS Score Atual
                  </div>
                  <div className="text-5xl font-black text-zinc-900 dark:text-white leading-none italic tracking-tighter uppercase mb-2">
                    {dashboardData?.nps?.nps_score ?? 0}
                  </div>
                  <div className="text-[9px] text-zinc-500 dark:text-zinc-600 font-bold uppercase tracking-widest">
                    Amostragem: {dashboardData?.nps?.total_responses ?? 0} feedbacks
                  </div>
                </div>

                <div className="h-[140px] w-full">
                  <NeonBarChart
                      data={dashboardData?.nps?.distribution || []}
                      xKey="score"
                      yKey="count"
                      color="#6366f1"
                      showGrid={false}
                  />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="vysify-glass p-10 rounded-[2.5rem] group"
              >
                <div className="flex items-center justify-between mb-8 border-b border-zinc-50 dark:border-zinc-800/50 pb-6">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                    FEED DE ATIVIDADES
                  </h3>
                </div>
                <ActivityFeed activities={dashboardData?.recentActivities} />
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="vysify-glass p-10 lg:col-span-3 rounded-[3rem]"
            >
              <div className="flex items-center justify-between mb-10 border-b border-zinc-50 dark:border-zinc-800/50 pb-6">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
                  CENTRO DE OPERAÇÕES
                </h3>
                <span className="px-5 py-2 bg-rose-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 italic">
                  PRIORIDADE MÁXIMA
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <UpcomingTasks tasks={dashboardData?.upcomingTasks} />
              </div>
            </motion.div>
          </div>
        </Content.Container>
      </AccountLayout>
  );
};

export default Workspace;
