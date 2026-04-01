import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { AccountLayout } from '@/layouts/index';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Paywall from '@/components/Paywall/index';
import api from '@/lib/common/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  PresentationChartLineIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlowingAreaChart from '@/components/Charts/GlowingAreaChart';

const CountUp = ({ value, durationMs = 900, className = '' }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, value]);

  return <span className={className}>{current}</span>;
};

const Analytics = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data, error } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics` : null, api);
  const { data: whatsappData } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics?scope=whatsapp` : null, api);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const locale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    if (base === 'pt') return 'pt-BR';
    return base;
  }, [i18n?.language]);

  const empty = useMemo(() => [], []);
  const salesByUser = data?.salesByUser || empty;
  const funnelData = data?.funnelData || empty;
  const salesTrend = data?.salesTrend || empty;
  const taskCompletionData = data?.taskCompletionData || empty;
  const sourceData = data?.sourceData || empty;
  const avgClosingTime = data?.avgClosingTime || 0;
  const pipelineRevenue = data?.pipelineRevenue || empty;
  const conversion = data?.conversion || { allTime: { total: 0, won: 0, rate: 0 }, last90Days: { total: 0, won: 0, rate: 0 } };

  const messageTrend = whatsappData?.messageTrend || empty;
  const messageTotals = whatsappData?.messageTotals || { inbound: 0, outbound: 0, total: 0 };

  const sellerPerformance = useMemo(() => {
    return (salesByUser || []).map((s) => ({
      name: s.user?.name || t('common.unassigned'),
      amount: s.amount || 0,
      won: s.count || 0,
    }));
  }, [salesByUser, t]);

  const taskPerformance = useMemo(() => {
    return (taskCompletionData || []).map((t) => ({
      name: t.user?.name || t('common.unassigned'),
      completed: t.completed || 0,
      total: t.total || 0,
      rate: t.rate || 0,
    }));
  }, [taskCompletionData, t]);

  const leadSources = useMemo(() => {
    return (sourceData || []).map((s) => ({
      name: s.source || t('analytics.source.direct'),
      count: s.count || 0,
      amount: s.amount || 0,
    }));
  }, [sourceData, t]);

  const salesTrendChart = useMemo(() => {
    return (salesTrend || []).map((s) => ({
      month: s.month,
      amount: s.amount || 0,
    }));
  }, [salesTrend]);

  const pipelineRevenueChart = useMemo(() => {
    const rows = (pipelineRevenue || [])
      .map((p) => ({
        pipeline: p.pipeline,
        revenue: p.revenue || 0,
        won: p.wonCount || 0,
        deals: p.dealsCount || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    return rows.slice(0, 12);
  }, [pipelineRevenue]);

  const whatsappTrendChart = useMemo(() => {
    const format = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    };
    return (messageTrend || []).map((d) => ({
      day: format(d.date),
      inbound: d.inbound || 0,
      outbound: d.outbound || 0,
      total: d.total || 0,
    }));
  }, [locale, messageTrend]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const formatCompact = (value) =>
    new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));



  const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#64748b'];

  const exportToCSV = () => {
    const csvRows = [];

    // Sales by User
    csvRows.push([t('analytics.export.sections.salesByUser')]);
    csvRows.push([t('analytics.export.columns.user'), t('analytics.export.columns.dealsWon'), t('analytics.export.columns.totalAmount')]);
    salesByUser.forEach(item => {
      csvRows.push([`"${item.user.name || t('common.unassigned')}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Sales Trend
    csvRows.push([t('analytics.export.sections.salesTrend')]);
    csvRows.push([t('analytics.export.columns.month'), t('analytics.export.columns.amount')]);
    salesTrend.forEach(item => {
      csvRows.push([`"${item.month}"`, item.amount]);
    });

    csvRows.push([]);

    // Pipeline Funnel
    csvRows.push([t('analytics.export.sections.pipelineFunnel')]);
    csvRows.push([t('analytics.export.columns.stage'), t('analytics.export.columns.count'), t('analytics.export.columns.amount')]);
    funnelData.forEach(item => {
      csvRows.push([`"${item.stage}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Task Completion
    csvRows.push([t('analytics.export.sections.taskCompletion')]);
    csvRows.push([t('analytics.export.columns.user'), t('analytics.export.columns.total'), t('analytics.export.columns.completed'), t('analytics.export.columns.ratePct')]);
    taskCompletionData?.forEach(item => {
      csvRows.push([`"${item.user.name || t('common.unassigned')}"`, item.total, item.completed, item.rate]);
    });

    csvRows.push([]);

    // Deals by Source
    csvRows.push([t('analytics.export.sections.dealsBySource')]);
    csvRows.push([t('analytics.export.columns.source'), t('analytics.export.columns.count'), t('analytics.export.columns.amount')]);
    sourceData?.forEach(item => {
      csvRows.push([`"${item.source}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Average Closing Time
    csvRows.push([t('analytics.export.sections.avgClosingTime')]);
    csvRows.push([t('analytics.export.columns.days')]);
    csvRows.push([avgClosingTime || 0]);

    csvRows.push([]);

    // Revenue by Pipeline
    csvRows.push(['Receita por pipeline']);
    csvRows.push(['Pipeline', 'Receita', 'Negócios ganhos', 'Negócios totais']);
    (pipelineRevenue || []).forEach((p) => {
      csvRows.push([`"${p.pipeline}"`, p.revenue || 0, p.wonCount || 0, p.dealsCount || 0]);
    });

    csvRows.push([]);

    // Conversion Rate
    csvRows.push(['Taxa de conversão']);
    csvRows.push(['Período', 'Total negócios', 'Negócios ganhos', 'Taxa (%)']);
    csvRows.push(['All time', conversion?.allTime?.total || 0, conversion?.allTime?.won || 0, conversion?.allTime?.rate || 0]);
    csvRows.push(['Últimos 90 dias', conversion?.last90Days?.total || 0, conversion?.last90Days?.won || 0, conversion?.last90Days?.rate || 0]);

    csvRows.push([]);

    // WhatsApp Messages (Last 30 Days)
    csvRows.push([t('analytics.export.sections.whatsappLast30Days')]);
    csvRows.push([t('analytics.export.columns.date'), t('analytics.whatsapp.inbound'), t('analytics.whatsapp.outbound'), t('analytics.whatsapp.total')]);
    (messageTrend || []).forEach(item => {
      csvRows.push([`"${item.date}"`, item.inbound || 0, item.outbound || 0, item.total || 0]);
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + csvRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_report_${workspaceSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) return (
    <AccountLayout>
      <div className="p-10 text-center text-red-500">{t('analytics.loadError')}</div>
    </AccountLayout>
  );

  if (!data) return (
    <AccountLayout>
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="w-20 h-20 border-[6px] border-zinc-100 dark:border-zinc-800 border-t-indigo-600 rounded-full animate-spin relative z-10"></div>
        </div>
        <p className="text-zinc-400 font-black text-[10px] tracking-[0.4em] uppercase italic mt-12 animate-pulse">Calculating Intelligence</p>
      </div>
    </AccountLayout>
  );

  const analyticsSteps = [
    {
      element: '#analytics-cards',
      popover: {
        title: t('onboarding.tour.analytics.step1.title'),
        description: t('onboarding.tour.analytics.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#analytics-whatsapp',
      popover: {
        title: 'Métricas de WhatsApp',
        description: 'Veja o volume de mensagens recebidas e enviadas, além da tendência diária.',
        position: 'top',
      }
    },
    {
      element: '#analytics-sellers',
      popover: {
        title: 'Performance do Time',
        description: 'Compare a receita gerada e o número de negócios ganhos por cada vendedor.',
        position: 'top',
      }
    },
    {
      element: '#analytics-funnel',
      popover: {
        title: 'Funil de Conversão',
        description: 'Identifique em quais estágios você está perdendo mais leads.',
        position: 'left',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="analytics-tour" steps={analyticsSteps} />
      <Meta title={`${t('Analytics')} - ${workspaceSlug}`} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <PresentationChartLineIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">Strategic Intelligence</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              Market <span className="text-indigo-600">Analytics</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed italic">
              Real-time insights into your sales performance and customer engagement.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToCSV}
            className="flex items-center px-8 py-4 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-premium-sm font-black text-[11px] uppercase tracking-widest italic"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-3" />
            {t('analytics.export.button')}
          </motion.button>
        </motion.div>
        <div id="analytics-cards">
          <Paywall
            minPlan="STANDARD"
            message="Analytics avançados como funil de conversão, desempenho de vendedores e tendências de receita estão disponíveis no plano Standard ou superior."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                      <ClockIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">{t('analytics.avgClosingTime.title')}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <CountUp value={avgClosingTime || 0} className="text-6xl font-executive font-black text-zinc-950 dark:text-white tracking-tighter italic" />
                    <span className="text-xl font-bold text-zinc-400 italic">DAYS</span>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium mt-4 italic">{t('analytics.avgClosingTime.subtitle')}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                      <SparklesIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">CONVERSION STRENGTH (90D)</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <CountUp value={conversion?.last90Days?.rate || 0} className="text-6xl font-executive font-black text-emerald-600 tracking-tighter italic" />
                    <span className="text-2xl font-bold text-zinc-400 italic font-executive">%</span>
                  </div>
                  <p className="text-sm text-zinc-400 font-medium mt-4 italic">
                    {`${conversion?.last90Days?.won || 0} WON / ${conversion?.last90Days?.total || 0} CREATED`}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                id="analytics-whatsapp"
                className="col-span-1 md:col-span-2 vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-zinc-950 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.whatsapp.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 whitespace-nowrap">Global Message Volume</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-10">
                  <div className="vysify-glass border-zinc-100 dark:border-zinc-800/50 p-5 rounded-[22px]">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">{t('analytics.whatsapp.inbound')}</div>
                    <div className="text-2xl font-executive font-black text-emerald-600 italic">
                      <CountUp value={messageTotals.inbound} />
                    </div>
                  </div>
                  <div className="vysify-glass border-zinc-100 dark:border-zinc-800/50 p-5 rounded-[22px]">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">{t('analytics.whatsapp.outbound')}</div>
                    <div className="text-2xl font-executive font-black text-indigo-600 italic">
                      <CountUp value={messageTotals.outbound} />
                    </div>
                  </div>
                  <div className="vysify-glass border-zinc-100 dark:border-zinc-800/50 p-5 rounded-[22px]">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Total</div>
                    <div className="text-2xl font-executive font-black text-zinc-900 dark:text-white italic">
                      <CountUp value={messageTotals.total} />
                    </div>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={whatsappTrendChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }}
                        />
                        <Bar dataKey="inbound" name={t('analytics.whatsapp.inbound')} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={1200} />
                        <Bar dataKey="outbound" name={t('analytics.whatsapp.outbound')} stackId="a" fill="#6366f1" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                id="analytics-sellers"
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                    <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.sellers.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Individual Business Impact</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sellerPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} height={60} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }}
                           formatter={(v, n) => (n === 'amount' ? formatCurrency(v) : v)} 
                        />
                        <Bar dataKey="amount" name={t('analytics.sellers.revenue')} fill="#6366f1" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
                        <Bar dataKey="won" name={t('analytics.sellers.dealsWon')} fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center border border-purple-100 dark:border-purple-800">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.tasksBySeller.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Execution Velocity</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} height={60} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }} />
                        <Bar dataKey="completed" name={t('analytics.tasksBySeller.completed')} fill="#a855f7" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
                        <Bar dataKey="total" name={t('analytics.tasksBySeller.total')} fill="#94a3b8" radius={[8, 8, 0, 0]} isAnimationActive opacity={0.3} animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-800">
                    <UserGroupIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.leadSources.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Channel Acquisition Meta</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }} formatter={(v, n, p) => {
                          const payload = p?.payload;
                          if (!payload) return v;
                          return [`${payload.count} DEALS • ${formatCurrency(payload.amount)}`, payload.name];
                        }} />
                        <Pie
                          data={leadSources}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          isAnimationActive
                          animationDuration={1200}
                        >
                          {leadSources.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                id="analytics-funnel"
                className="vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-zinc-950 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <FunnelIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.salesFunnel.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Conversion Leak Analysis</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }} formatter={(v, n, p) => {
                          const payload = p?.payload;
                          if (!payload) return v;
                          return [`${payload.count} DEALS • ${formatCurrency(payload.amount)}`, payload.stage];
                        }} />
                        <Funnel
                          dataKey="count"
                          data={funnelData || []}
                          nameKey="stage"
                          isAnimationActive
                          animationDuration={1200}
                          opacity={0.8}
                        >
                          <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="stage" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                          {(funnelData || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="col-span-1 md:col-span-2 vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-glow-indigo/20">
                    <PresentationChartLineIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">{t('analytics.salesTrend.title')}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Long-term Revenue Momentum</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-80 w-full mt-4">
                    <GlowingAreaChart
                      data={salesTrendChart}
                      xKey="month"
                      yKey="amount"
                      color="#6366f1"
                      formatYAxis={formatCompact}
                      formatTooltipValue={(v) => formatCurrency(v)}
                    />
                  </div>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="col-span-1 md:col-span-2 vysify-glass p-10 rounded-[3rem] border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-glow-emerald/20">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">Revenue by Pipeline</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1 italic">Asset Distribution & Deal Flow</p>
                  </div>
                </div>

                {mounted ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipelineRevenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="pipeline" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} height={70} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(10px)' }} formatter={(v, n) => (n === 'revenue' ? formatCurrency(v) : v)} />
                        <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1500} />
                        <Bar dataKey="won" name="Won" fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </motion.div>
            </div>
          </Paywall>
        </div>
      </div>
    </AccountLayout>
  );
};

export default Analytics;
