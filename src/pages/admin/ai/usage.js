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

const toDateOnlyUtc = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const formatDateOnly = (date) => toDateOnlyUtc(date).toISOString().slice(0, 10);

const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

const formatMoneyFromCents = (valueInCents, currency) => {
  const cents = Number(valueInCents || 0);
  const cur = String(currency || '').trim().toUpperCase() || 'BRL';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
};

const UsagePage = () => {
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
    return `/api/admin/ai/usage?${params.toString()}`;
  }, [session, start, end, workspaceId]);

  const { data, error } = useSWR(queryUrl, fetcher);
  const { data: workspacesData } = useSWR(session ? '/api/admin/workspaces' : null, fetcher);

  const isLoading = !data && !error;
  const metrics = data?.data || null;
  const workspaces = workspacesData?.data?.workspaces || [];

  const byDay = metrics?.byDay || [];
  const totals = metrics?.totals || { tokens: 0, events: 0, billedAmount: 0 };

  const currencyBreakdown = metrics?.billedByCurrency || [];
  const topWorkspaces = metrics?.topWorkspaces || [];
  const topRoutes = metrics?.topRoutes || [];
  const topModels = metrics?.topModels || [];

  const billedChartCurrency = useMemo(() => {
    if (currencyBreakdown.length === 1) return currencyBreakdown[0]?.currency || 'BRL';
    if (workspaceId && currencyBreakdown.length > 0) return currencyBreakdown[0]?.currency || 'BRL';
    return 'BRL';
  }, [currencyBreakdown, workspaceId]);

  return (
    <AdminLayout>
      <Meta title="AI - Usage" />
      <Content.Title title="AI" subtitle="Uso e Cobrança" className="font-executive" />
      <Content.Divider />

      <Content.Container>
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

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <Card.Body title="Tokens" subtitle="Total no período">
              <div className="text-3xl font-executive font-bold text-gray-900">{isLoading ? '-' : formatNumber(totals.tokens)}</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Eventos" subtitle="Chamadas registradas">
              <div className="text-3xl font-executive font-bold text-gray-900">{isLoading ? '-' : formatNumber(totals.events)}</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Overage" subtitle="Soma de invoice items (menor unidade)">
              <div className="text-3xl font-executive font-bold text-gray-900">
                {isLoading ? '-' : formatMoneyFromCents(totals.billedAmount, billedChartCurrency)}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {currencyBreakdown.length <= 1
                  ? ''
                  : 'Há múltiplas moedas no período; veja o detalhamento abaixo.'}
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <Card.Body title="Tokens por dia" subtitle="Tendência (somatório diário)">
              <div className="h-[320px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : byDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={52} />
                      <Tooltip formatter={(v) => formatNumber(v)} />
                      <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Overage por dia" subtitle="Somatório por dia (menor unidade)">
              <div className="h-[320px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Carregando...</div>
                ) : byDay.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Sem dados.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDay} barCategoryGap={18}>
                      <defs>
                        <linearGradient id="overageBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.25} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis axisLine={false} tickLine={false} width={52} />
                      <Tooltip formatter={(v) => formatMoneyFromCents(v, billedChartCurrency)} />
                      <Bar dataKey="billedAmount" fill="url(#overageBar)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <Card.Body title="Top workspaces" subtitle="Maior consumo de tokens no período">
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
                      <YAxis
                        type="category"
                        dataKey="slug"
                        width={120}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(v) => formatNumber(v)} />
                      <Bar dataKey="tokens" fill="#6366f1" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Overage por moeda" subtitle="Detalhamento dos invoice items">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moeda</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={3}>
                          Carregando...
                        </td>
                      </tr>
                    ) : currencyBreakdown.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={3}>
                          Sem overage cobrado no período.
                        </td>
                      </tr>
                    ) : (
                      currencyBreakdown.map((row) => (
                        <tr key={row.currency}>
                          <td className="px-4 py-3 text-sm text-gray-900">{String(row.currency || 'unknown').toUpperCase()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatMoneyFromCents(row.billedAmount, row.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(row.invoiceItems)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <Card.Body title="Top rotas" subtitle="Onde a IA é mais usada">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rota</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eventos</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>
                          Carregando...
                        </td>
                      </tr>
                    ) : topRoutes.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      topRoutes.map((r) => (
                        <tr key={r.route}>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.route}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.tokens)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.events)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.overageEvents)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body title="Top modelos" subtitle="Distribuição por modelo">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eventos</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Overage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>
                          Carregando...
                        </td>
                      </tr>
                    ) : topModels.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      topModels.map((r) => (
                        <tr key={r.model}>
                          <td className="px-4 py-3 text-sm text-gray-900">{r.model}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.tokens)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.events)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(r.overageEvents)}</td>
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

export default UsagePage;

