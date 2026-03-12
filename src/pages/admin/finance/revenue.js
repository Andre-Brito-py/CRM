import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import Meta from '@/components/Meta/index';

const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

const PlatformRevenue = () => {
  const { data: session } = useSession();
  const { data, error } = useSWR(session ? '/api/admin/finance/revenue' : null, fetcher);

  const isLoading = !data && !error;
  const metrics = data?.data || null;

  const chartData = useMemo(() => {
    const rows = metrics?.transactionsPerProvider || [];
    return rows.map((r) => ({
      provider: r?.provider?.displayName || r?.provider?.name || 'Unknown',
      revenue: Number(r.revenue || 0),
      volume: Number(r.volume || 0),
      count: Number(r.count || 0),
    }));
  }, [metrics]);

  return (
    <AdminLayout>
      <Meta title="Finance - Platform Revenue" />
      <Content.Title title="Finance" subtitle="Platform Revenue" className="font-executive" />
      <Content.Divider />

      <Content.Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <Card.Body title="Total volume">
              <div className="text-3xl font-executive font-bold text-gray-900">
                {isLoading ? '-' : formatMoney(metrics?.totalTransactionVolume)}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {isLoading ? '' : `${metrics?.transactionsCount || 0} transações`}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Receita da plataforma">
              <div className="text-3xl font-executive font-bold text-gray-900">
                {isLoading ? '-' : formatMoney(metrics?.platformRevenue)}
              </div>
              <div className="mt-2 text-xs text-gray-500">Taxas somadas (platform_fee)</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Receita este mês">
              <div className="text-3xl font-executive font-bold text-gray-900">
                {isLoading ? '-' : formatMoney(metrics?.revenueThisMonth)}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {isLoading ? '' : `${metrics?.transactionsThisMonth || 0} transações`}
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <Card.Body title="Receita por gateway" subtitle="Soma por provider">
              <div className="h-[360px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap={18}>
                      <defs>
                        <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.25} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="provider" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={48} />
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Bar dataKey="revenue" fill="url(#revBar)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default PlatformRevenue;

