import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';

const Analytics = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [surveyId, setSurveyId] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (surveyId) params.set('surveyId', surveyId);
    return params.toString();
  }, [from, to, surveyId]);

  const { data: surveysData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/surveys` : null,
    fetcher
  );
  const { data: analyticsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/analytics${query ? `?${query}` : ''}` : null,
    fetcher
  );

  const surveys = surveysData?.data?.surveys || [];
  const metrics = analyticsData?.data || null;

  const motionIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <AccountLayout>
      <Meta title="Customer Satisfaction - Analytics" />
      <Content.Title title="Customer Satisfaction" subtitle="Analytics" className="font-executive" />
      <Content.Divider />

      <motion.div {...motionIn}>
        <Card>
          <Card.Body>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">De</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Até</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Pesquisa</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
              >
                <option value="">Todas</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </Card.Body>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-6">
        <motion.div className="lg:col-span-1" {...motionIn} transition={{ ...motionIn.transition, delay: 0.06 }}>
          <Card>
            <Card.Body title="NPS Score">
              <div className="text-5xl font-executive font-bold text-gray-900">{metrics?.nps_score ?? '-'}</div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-bold text-gray-900">{metrics?.total_responses ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500">Promoters</div>
                  <div className="font-bold text-gray-900">{metrics?.promoters ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500">Passives</div>
                  <div className="font-bold text-gray-900">{metrics?.passives ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500">Detractors</div>
                  <div className="font-bold text-gray-900">{metrics?.detractors ?? 0}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2" {...motionIn} transition={{ ...motionIn.transition, delay: 0.12 }}>
          <Card>
            <Card.Body title="Distribuição de notas">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={`dist-${surveyId}-${from}-${to}`}
                    data={metrics?.distribution || []}
                    barCategoryGap={10}
                  >
                    <defs>
                      <linearGradient id="npsDistBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.25} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                    <XAxis dataKey="score" axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="url(#npsDistBar)"
                      radius={[10, 10, 0, 0]}
                      isAnimationActive
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      <motion.div className="mt-6" {...motionIn} transition={{ ...motionIn.transition, delay: 0.18 }}>
        <Card>
          <Card.Body title="Tendência mensal">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart key={`trend-${surveyId}-${from}-${to}`} data={metrics?.trend || []}>
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
          </Card.Body>
        </Card>
      </motion.div>
    </AccountLayout>
  );
};

export default Analytics;
