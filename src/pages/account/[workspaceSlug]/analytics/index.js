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
      <div className="p-10 text-center text-gray-500 animate-pulse">{t('analytics.loading')}</div>
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
      <div id="analytics-header" className="flex justify-between items-end">
        <Content.Title title={t('Analytics')} subtitle={t('analytics.subtitle')} />
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors text-sm font-medium mb-2 shadow-sm"
        >
          {t('analytics.export.button')}
        </button>
      </div>
      <Content.Divider />
      <Content.Container>
        <div id="analytics-cards">
          <Paywall
            minPlan="STANDARD"
            message="Analytics avançados como funil de conversão, desempenho de vendedores e tendências de receita estão disponíveis no plano Standard ou superior."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <Card.Body title={t('analytics.avgClosingTime.title')}>
                  <div className="flex flex-col items-center justify-center h-full py-6">
                    <CountUp value={avgClosingTime || 0} className="text-5xl font-bold text-brand-600" />
                    <span className="text-gray-500 text-lg mt-2">{t('analytics.avgClosingTime.days')}</span>
                    <p className="text-sm text-gray-400 mt-4 text-center">
                      {t('analytics.avgClosingTime.subtitle')}
                    </p>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body title="Taxa de conversão (últimos 90 dias)">
                  <div className="flex flex-col items-center justify-center h-full py-6">
                    <CountUp value={conversion?.last90Days?.rate || 0} className="text-5xl font-bold text-emerald-600" />
                    <span className="text-gray-500 text-lg mt-2">%</span>
                    <p className="text-sm text-gray-400 mt-4 text-center">
                      {`${conversion?.last90Days?.won || 0} ganhos / ${conversion?.last90Days?.total || 0} negócios criados`}
                    </p>
                  </div>
                </Card.Body>
              </Card>

              <Card id="analytics-whatsapp">
                <Card.Body title={t('analytics.whatsapp.title')}>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-gray-50 border px-3 py-2">
                      <div className="text-xs text-gray-500">{t('analytics.whatsapp.inbound')}</div>
                      <div className="text-xl font-semibold text-gray-900">
                        <CountUp value={messageTotals.inbound} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border px-3 py-2">
                      <div className="text-xs text-gray-500">{t('analytics.whatsapp.outbound')}</div>
                      <div className="text-xl font-semibold text-gray-900">
                        <CountUp value={messageTotals.outbound} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border px-3 py-2">
                      <div className="text-xs text-gray-500">{t('analytics.whatsapp.total')}</div>
                      <div className="text-xl font-semibold text-gray-900">
                        <CountUp value={messageTotals.total} />
                      </div>
                    </div>
                  </div>

                  {mounted ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={whatsappTrendChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="inbound" name={t('analytics.whatsapp.inbound')} stackId="a" fill="#16a34a" isAnimationActive animationDuration={900} />
                          <Bar dataKey="outbound" name={t('analytics.whatsapp.outbound')} stackId="a" fill="#2563eb" isAnimationActive animationDuration={900} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card id="analytics-sellers">
                <Card.Body title={t('analytics.sellers.title')}>
                  {mounted ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sellerPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                          <Tooltip formatter={(v, n) => (n === 'amount' ? formatCurrency(v) : v)} />
                          <Legend />
                          <Bar dataKey="amount" name={t('analytics.sellers.revenue')} fill="#2563eb" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                          <Bar dataKey="won" name={t('analytics.sellers.dealsWon')} fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card>
                <Card.Body title={t('analytics.tasksBySeller.title')}>
                  {mounted ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={taskPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" name={t('analytics.tasksBySeller.completed')} fill="#7c3aed" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                          <Bar dataKey="total" name={t('analytics.tasksBySeller.total')} fill="#94a3b8" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card>
                <Card.Body title={t('analytics.leadSources.title')}>
                  {mounted ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip formatter={(v, n, p) => {
                            const payload = p?.payload;
                            if (!payload) return v;
                            return [`${payload.count} ${t('analytics.deals')} • ${formatCurrency(payload.amount)}`, payload.name];
                          }} />
                          <Legend />
                          <Pie
                            data={leadSources}
                            dataKey="amount"
                            nameKey="name"
                            outerRadius={90}
                            isAnimationActive
                            animationDuration={900}
                          >
                            {leadSources.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card id="analytics-funnel">
                <Card.Body title={t('analytics.salesFunnel.title')}>
                  {mounted ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <Tooltip formatter={(v, n, p) => {
                            const payload = p?.payload;
                            if (!payload) return v;
                            return [`${payload.count} ${t('analytics.deals')} • ${formatCurrency(payload.amount)}`, payload.stage];
                          }} />
                          <Funnel
                            dataKey="count"
                            data={funnelData || []}
                            nameKey="stage"
                            isAnimationActive
                            animationDuration={900}
                          >
                            <LabelList position="right" fill="#111827" stroke="none" dataKey="stage" />
                            {(funnelData || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card className="col-span-1 md:col-span-2">
                <Card.Body title={t('analytics.salesTrend.title')}>
                  {mounted ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesTrendChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            name={t('analytics.salesTrend.revenue')}
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={false}
                            isAnimationActive
                            animationDuration={900}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>

              <Card className="col-span-1 md:col-span-2">
                <Card.Body title="Receita por pipeline">
                  {mounted ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineRevenueChart} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="pipeline" tick={{ fontSize: 11 }} interval={0} height={70} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompact} />
                          <Tooltip formatter={(v, n) => (n === 'revenue' ? formatCurrency(v) : v)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Receita" fill="#2563eb" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                          <Bar dataKey="won" name="Ganhos" fill="#16a34a" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </Card.Body>
              </Card>
            </div>
          </Paywall>
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default Analytics;
