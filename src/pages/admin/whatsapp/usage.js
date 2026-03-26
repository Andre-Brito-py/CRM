import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

const toDateOnlyUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const formatDateOnly = (date) => toDateOnlyUtc(date).toISOString().slice(0, 10);

const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

const WhatsAppUsagePage = () => {
  const { data: session } = useSession();

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => formatDateOnly(today), [today]);
  const defaultStart = useMemo(() => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 30);
    return formatDateOnly(d);
  }, [today]);

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [workspaceId, setWorkspaceId] = useState('');

  const queryUrl = useMemo(() => {
    if (!session) return null;
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (workspaceId) params.set('workspaceId', workspaceId);
    return `/api/admin/whatsapp/usage?${params.toString()}`;
  }, [session, start, end, workspaceId]);

  const { data, error } = useSWR(queryUrl, fetcher);
  const { data: workspacesData } = useSWR(session ? '/api/admin/workspaces' : null, fetcher);

  const isLoading = !data && !error;
  const metrics = data?.data || null;
  const workspaces = workspacesData?.data?.workspaces || [];

  const byDay = metrics?.byDay || [];
  const totals = metrics?.totals || { events: 0 };
  const topWorkspaces = metrics?.topWorkspaces || [];

  const totalOutbound = byDay.reduce((acc, d) => acc + (d.outbound || 0), 0);
  const totalInbound = byDay.reduce((acc, d) => acc + (d.inbound || 0), 0);

  return (
    <AdminLayout>
      <Meta title="WhatsApp - Usage" />
      <Content.Title title="WhatsApp" subtitle="Uso e Controle de Mensagens" className="font-executive" />
      <Content.Divider />

      <Content.Container>
        {/* Filters */}
        <Card>
          <Card.Body title="Filtros" subtitle="Acompanhe o uso por período e workspace">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500">Início</div>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500">Fim</div>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500">Workspace</div>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Todos</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <Card.Body title="Total Mensagens" subtitle="Período selecionado">
              <div className="text-3xl font-executive font-bold text-gray-900">
                {isLoading ? '-' : formatNumber(totals.events)}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="📤 Enviadas (Outbound)" subtitle="Mensagens disparadas">
              <div className="text-3xl font-executive font-bold text-green-700">
                {isLoading ? '-' : formatNumber(totalOutbound)}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="📥 Recebidas (Inbound)" subtitle="Mensagens recebidas">
              <div className="text-3xl font-executive font-bold text-blue-700">
                {isLoading ? '-' : formatNumber(totalInbound)}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Chart: Messages per day */}
        <div className="mt-6">
          <Card>
            <Card.Body title="Mensagens por dia" subtitle="Enviadas vs Recebidas">
              <div className="h-[320px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : byDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados no período.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={40} />
                      <Tooltip formatter={(v) => formatNumber(v)} />
                      <Line type="monotone" dataKey="outbound" stroke="#10b981" strokeWidth={2} dot={false} name="Enviadas" />
                      <Line type="monotone" dataKey="inbound" stroke="#6366f1" strokeWidth={2} dot={false} name="Recebidas" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Top workspaces by usage */}
        <div className="mt-6">
          <Card>
            <Card.Body title="Top Workspaces" subtitle="Maior volume de mensagens no período">
              <div className="h-[360px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : topWorkspaces.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topWorkspaces} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.12} />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="slug" width={120} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatNumber(v)} />
                      <Bar dataKey="outbound" fill="#10b981" radius={[0, 6, 6, 0]} name="Enviadas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Workspace detail table */}
        <div className="mt-6">
          <Card>
            <Card.Body title="Detalhamento por Workspace" subtitle="Enviadas, recebidas e eventos de overage">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workspace</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">📤 Enviadas</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>Carregando...</td>
                      </tr>
                    ) : topWorkspaces.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>Sem dados.</td>
                      </tr>
                    ) : (
                      topWorkspaces.map((r) => (
                        <tr key={r.workspaceId}>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.name} <span className="text-gray-400">({r.slug})</span></td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.events)}</td>
                          <td className="px-4 py-3 text-sm text-green-700 font-medium text-right">{formatNumber(r.outbound)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {r.overageEvents > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{formatNumber(r.overageEvents)}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default WhatsAppUsagePage;
