import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

const Forecast = () => {
  const { data: session } = useSession();
  const [days, setDays] = useState(30);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('days', String(days));
    return params.toString();
  }, [days]);

  const { data, error } = useSWR(session ? `/api/admin/payments/forecast?${query}` : null, fetcher);
  const summary = data?.data?.summary || null;
  const series = data?.data?.series;
  const isLoading = !data && !error;

  const chartData = useMemo(
    () =>
      (Array.isArray(series) ? series : []).map((p) => ({
        date: p.date,
        total: Number(p.total || 0),
        count: Number(p.count || 0),
      })),
    [series]
  );

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Previsão de ganhos</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/payments" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Pagamentos
            </Link>
            <Link href="/admin/payments/overdue" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Atrasados
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Baseado nas cobranças (Payments) com vencimento.</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Janela</span>
                <select
                  className="rounded-md border border-gray-300 bg-white p-2 text-sm"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={7}>7 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="bg-white shadow sm:rounded-md p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Previsto (próximos {summary?.upcomingDays ?? days} dias)</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {summary ? formatMoney(summary.upcomingTotal) : '-'}
                </div>
                <div className="mt-1 text-xs text-gray-500">{summary ? `${summary.upcomingCount} cobranças` : ''}</div>
              </div>
              <div className="bg-white shadow sm:rounded-md p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Recebido (últimos 30 dias)</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {summary ? formatMoney(summary.paidLast30Total) : '-'}
                </div>
                <div className="mt-1 text-xs text-gray-500">{summary ? `${summary.paidLast30Count} recebimentos` : ''}</div>
              </div>
              <div className="bg-white shadow sm:rounded-md p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Atrasado</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {summary ? formatMoney(summary.overdueTotal) : '-'}
                </div>
                <div className="mt-1 text-xs text-gray-500">{summary ? `${summary.overdueCount} cobranças` : ''}</div>
              </div>
            </div>

            <div className="bg-white shadow sm:rounded-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Fluxo previsto por dia</div>
                  <div className="text-xs text-gray-500">Soma de valores por vencimento</div>
                </div>
              </div>
              <div className="mt-4 h-[320px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        labelFormatter={(label) => `Vencimento: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={false}
                        strokeLinecap="round"
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Forecast;
