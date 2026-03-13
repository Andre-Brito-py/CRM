import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, CpuChipIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import formatDistance from 'date-fns/formatDistance';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const parseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const System = () => {
  const { data: session } = useSession();
  const { data } = useSWR(session ? '/api/admin/system/health' : null, fetcher, {
    refreshInterval: 5000,
  });
  const { data: incidentsData, mutate: mutateIncidents } = useSWR(
    session ? '/api/admin/support/incidents' : null,
    fetcher,
    { refreshInterval: 15000 }
  );
  const [running, setRunning] = useState(null);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('P2');
  const [incidentSummary, setIncidentSummary] = useState('');
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState('');

  const health = data?.data;
  const isLoading = !data;
  const incidents = incidentsData?.data?.incidents || [];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const metrics = health?.metrics || null;

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">System Health</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading system status...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Database Status */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {health.dbStatus === 'connected' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Database Status</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 capitalize">{health.dbStatus}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Latency: {health.dbLatency}ms
                  </div>
                </div>
              </div>

              {/* Uptime */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">System Uptime</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{formatUptime(health.uptime)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Node: {health.nodeVersion} on {health.platform}
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CpuChipIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Memory Usage</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{formatBytes(health.memory.rss)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Heap Used: {formatBytes(health.memory.heapUsed)}
                  </div>
                </div>
              </div>

              {/* Webhooks */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ServerIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Webhook Deliveries</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            Failed (1h): {metrics?.webhooks?.failedLastHour ?? 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Retry due: {metrics?.webhooks?.pendingRetryDue ?? 0}
                  </div>
                </div>
              </div>

              {/* Jobs */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ServerIcon className="h-6 w-6 text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Automation Jobs</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            Due: {metrics?.jobs?.due ?? 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Failed (24h): {metrics?.jobs?.failedLastDay ?? 0} · Running stuck: {metrics?.jobs?.runningStuck ?? 0}
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ServerIcon className="h-6 w-6 text-rose-400" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Payments</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            Overdue: {metrics?.payments?.overdue ?? 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm text-gray-500">
                    Updated {formatDistance(new Date(health.timestamp), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Ações operacionais</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Reprocessos manuais (SUPERADMIN).</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={running === 'webhooks'}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    onClick={async () => {
                      setRunning('webhooks');
                      try {
                        toast.loading('Rodando reprocessamento de webhooks...', { id: 'run_webhooks' });
                        const res = await api('/api/admin/system/run-webhook-deliveries', { method: 'POST' });
                        if (res?.error?.msg) throw new Error(res.error.msg);
                        const processed = res?.data?.processed ?? 0;
                        const total = res?.data?.total ?? 0;
                        toast.success(`Webhooks: processados ${processed}/${total}`, { id: 'run_webhooks' });
                      } catch (e) {
                        toast.error(e?.message || 'Falha ao rodar webhooks', { id: 'run_webhooks' });
                      } finally {
                        setRunning(null);
                      }
                    }}
                  >
                    {running === 'webhooks' ? 'Rodando...' : 'Rodar webhooks (due)'}
                  </button>
                  <button
                    type="button"
                    disabled={running === 'jobs'}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                    onClick={async () => {
                      setRunning('jobs');
                      try {
                        toast.loading('Rodando jobs de automação...', { id: 'run_jobs' });
                        const res = await api('/api/admin/system/run-automation-jobs', { method: 'POST' });
                        if (res?.error?.msg) throw new Error(res.error.msg);
                        toast.success('Jobs de automação executados', { id: 'run_jobs' });
                      } catch (e) {
                        toast.error(e?.message || 'Falha ao rodar jobs', { id: 'run_jobs' });
                      } finally {
                        setRunning(null);
                      }
                    }}
                  >
                    {running === 'jobs' ? 'Rodando...' : 'Rodar automações (due)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Incidentes e SLA</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Registro interno para suporte e operação.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sev</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resposta</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolução</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escalonamento</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-700">
                      <tr>
                        <td className="px-3 py-2 font-semibold">P0</td>
                        <td className="px-3 py-2">15 min</td>
                        <td className="px-3 py-2">4 h</td>
                        <td className="px-3 py-2">imediato</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold">P1</td>
                        <td className="px-3 py-2">1 h</td>
                        <td className="px-3 py-2">24 h</td>
                        <td className="px-3 py-2">após 1 h sem ack</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold">P2</td>
                        <td className="px-3 py-2">4 h</td>
                        <td className="px-3 py-2">3 dias</td>
                        <td className="px-3 py-2">após 1 dia</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold">P3</td>
                        <td className="px-3 py-2">1 dia</td>
                        <td className="px-3 py-2">7 dias</td>
                        <td className="px-3 py-2">se impacto aumentar</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <div className="text-sm font-medium text-gray-900">Criar incidente</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600">Título</label>
                        <input
                          type="text"
                          value={incidentTitle}
                          onChange={(e) => setIncidentTitle(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Ex: Webhook de pagamentos falhando"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Severidade</label>
                        <select
                          value={incidentSeverity}
                          onChange={(e) => setIncidentSeverity(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="P0">P0</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-600">Resumo</label>
                        <textarea
                          value={incidentSummary}
                          onChange={(e) => setIncidentSummary(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Impacto, sintomas, links úteis (sem dados sensíveis)"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={!incidentTitle.trim() || creatingIncident}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-black disabled:opacity-60"
                        onClick={async () => {
                          const title = incidentTitle.trim();
                          if (!title) return;
                          setCreatingIncident(true);
                          try {
                            toast.loading('Criando incidente...', { id: 'incident_create' });
                            const res = await api('/api/admin/support/incidents', {
                              method: 'POST',
                              body: { title, severity: incidentSeverity, summary: incidentSummary.trim() },
                            });
                            if (res?.error?.msg) throw new Error(res.error.msg);
                            toast.success('Incidente criado', { id: 'incident_create' });
                            setIncidentTitle('');
                            setIncidentSummary('');
                            mutateIncidents();
                          } catch (e) {
                            toast.error(e?.message || 'Falha ao criar incidente', { id: 'incident_create' });
                          } finally {
                            setCreatingIncident(false);
                          }
                        }}
                      >
                        {creatingIncident ? 'Criando...' : 'Criar incidente'}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="text-sm font-medium text-gray-900">Escalonamento</div>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <div>1) Identificar impacto e severidade (P0–P3).</div>
                      <div>2) Ack e abrir canal interno de coordenação.</div>
                      <div>3) Mitigar (feature flag/rollback/rate limit/pausar jobs).</div>
                      <div>4) Comunicar status e estimativa para clientes afetados.</div>
                      <div>5) Resolver e registrar postmortem breve.</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Últimos incidentes</div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => mutateIncidents()}
                    >
                      Atualizar
                    </button>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sev</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-gray-500">
                              Nenhum incidente registrado.
                            </td>
                          </tr>
                        ) : (
                          incidents.slice(0, 25).map((incident) => {
                            const details = incident.details || parseJson(incident.content) || {};
                            const status = details?.status || 'OPEN';
                            const sev = details?.severity || 'P2';
                            const responseDueAt = details?.responseDueAt ? new Date(details.responseDueAt) : null;
                            const resolveDueAt = details?.resolveDueAt ? new Date(details.resolveDueAt) : null;
                            const ackAt = details?.acknowledgedAt ? new Date(details.acknowledgedAt) : null;
                            const resolvedAt = details?.resolvedAt ? new Date(details.resolvedAt) : null;
                            const now = new Date();
                            const responseOverdue = status === 'OPEN' && !ackAt && responseDueAt && responseDueAt < now;
                            const resolveOverdue = status !== 'RESOLVED' && resolveDueAt && resolveDueAt < now;

                            return (
                              <tr key={incident.id}>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === 'RESOLVED'
                                        ? 'bg-green-100 text-green-800'
                                        : responseOverdue || resolveOverdue
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-semibold">{sev}</td>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-900">{incident.title}</div>
                                  <div className="text-xs text-gray-500">
                                    {resolvedAt ? `Resolvido ${formatDistance(new Date(resolvedAt), new Date(), { addSuffix: true })}` : `Aberto ${formatDistance(new Date(incident.createdAt), new Date(), { addSuffix: true })}`}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600">
                                  <div className={responseOverdue ? 'text-red-700 font-semibold' : ''}>
                                    Resp: {responseDueAt ? responseDueAt.toLocaleString() : '-'}
                                  </div>
                                  <div className={resolveOverdue ? 'text-red-700 font-semibold' : ''}>
                                    Res: {resolveDueAt ? resolveDueAt.toLocaleString() : '-'}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right space-x-2">
                                  {status !== 'RESOLVED' && (
                                    <>
                                      <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        onClick={async () => {
                                          try {
                                            toast.loading('Marcando ack...', { id: `ack_${incident.id}` });
                                            const res = await api(`/api/admin/support/incidents/${incident.id}`, {
                                              method: 'PATCH',
                                              body: { action: 'ACK' },
                                            });
                                            if (res?.error?.msg) throw new Error(res.error.msg);
                                            toast.success('Ack registrado', { id: `ack_${incident.id}` });
                                            mutateIncidents();
                                          } catch (e) {
                                            toast.error(e?.message || 'Falha ao marcar ack', { id: `ack_${incident.id}` });
                                          }
                                        }}
                                      >
                                        Ack
                                      </button>
                                      <button
                                        type="button"
                                        className="text-xs px-2 py-1 rounded border border-green-600 text-green-700 hover:bg-green-50"
                                        onClick={async () => {
                                          try {
                                            toast.loading('Resolvendo...', { id: `resolve_${incident.id}` });
                                            const res = await api(`/api/admin/support/incidents/${incident.id}`, {
                                              method: 'PATCH',
                                              body: { action: 'RESOLVE' },
                                            });
                                            if (res?.error?.msg) throw new Error(res.error.msg);
                                            toast.success('Incidente resolvido', { id: `resolve_${incident.id}` });
                                            mutateIncidents();
                                          } catch (e) {
                                            toast.error(e?.message || 'Falha ao resolver', { id: `resolve_${incident.id}` });
                                          }
                                        }}
                                      >
                                        Resolver
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Onboarding / Migração</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Checklist operacional por workspace.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Workspace slug</label>
                    <input
                      type="text"
                      value={workspaceSlug}
                      onChange={(e) => setWorkspaceSlug(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="ex: acme"
                    />
                  </div>
                  <Link
                    href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}` : '#'}
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${workspaceSlug.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 pointer-events-none'
                      }`}
                  >
                    Abrir workspace
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900">Checklist (primeira semana)</div>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <div>1) Aplicar preset do segmento (Settings → General).</div>
                      <div>2) Importar contatos (Contacts → Import).</div>
                      <div>3) Configurar WhatsApp (Integrations → WhatsApp).</div>
                      <div>4) Criar templates (Settings → Templates).</div>
                      <div>5) Validar pipeline e etapas (Pipeline).</div>
                      <div>6) Configurar webhooks/API keys se necessário (Integrations).</div>
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900">Atalhos</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/admin/users" className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50">
                        Masquerade
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/settings/general` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        Presets
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/contacts/import` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        Importar contatos
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/integrations/whatsapp` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        WhatsApp
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/settings/templates` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        Templates
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/pipeline` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        Pipeline
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/integrations/webhooks` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        Webhooks
                      </Link>
                      <Link
                        href={workspaceSlug.trim() ? `/account/${workspaceSlug.trim()}/integrations/api-keys` : '#'}
                        className={`text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 ${workspaceSlug.trim() ? '' : 'pointer-events-none opacity-60'}`}
                      >
                        API keys
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Raw Stats</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed system information.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">CPU Load Average (1m, 5m, 15m)</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {health.cpu.map(l => l.toFixed(2)).join(', ')}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Operational Metrics</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Webhooks failed (1h): {metrics?.webhooks?.failedLastHour ?? 0} · Retry due: {metrics?.webhooks?.pendingRetryDue ?? 0} · Jobs due: {metrics?.jobs?.due ?? 0} · Jobs failed (24h): {metrics?.jobs?.failedLastDay ?? 0} · Jobs running stuck: {metrics?.jobs?.runningStuck ?? 0} · Payments overdue: {metrics?.payments?.overdue ?? 0}
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(health.timestamp).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {health && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Playbooks</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Como investigar incidentes comuns.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  <details className="rounded-md border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      Falha de webhook (pagamentos/integrações)
                    </summary>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <div>1) Verifique o card de Webhooks: Failed (1h) e Retry due.</div>
                      <div>2) Confira logs por request-id no período do erro e o endpoint afetado.</div>
                      <div>3) Valide token/assinatura e payload size (429/413/400 indicam bloqueio/assinatura inválida).</div>
                      <div>4) Se houver fila de reprocessamento: confirme se os retries estão rodando e reduzindo o backlog.</div>
                    </div>
                  </details>

                  <details className="rounded-md border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      Falha de pagamento (status divergente/overdue)
                    </summary>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <div>1) Verifique o card de Payments: Overdue.</div>
                      <div>2) Confirme no provider o status real do pagamento e se o webhook foi entregue.</div>
                      <div>3) Se webhook falhou: acione retry/reprocessamento e valide idempotência.</div>
                      <div>4) Se houver inconsistência recorrente: investigar regra de reconciliação e chaves do provider.</div>
                    </div>
                  </details>

                  <details className="rounded-md border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      Falha de envio WhatsApp (mensagens não saem)
                    </summary>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <div>1) Confira integração ativa (provider WHATSAPP) e credenciais/configuração (verify token, access token).</div>
                      <div>2) Verifique logs de erro no envio e limites do provider (429/limites de throughput).</div>
                      <div>3) Verifique se o webhook de recebimento está ok (para estados/ack).</div>
                      <div>4) Se impacto generalizado: validar conectividade externa e status do provider.</div>
                    </div>
                  </details>

                  <details className="rounded-md border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      Queda/instabilidade de DB
                    </summary>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <div>1) Verifique Database Status e Latency.</div>
                      <div>2) Se status desconectado: checar variáveis de ambiente e conectividade do Postgres.</div>
                      <div>3) Se latência alta: identificar queries pesadas e workloads recentes (jobs, imports, webhooks).</div>
                      <div>4) Se necessário: reduzir tráfego (rate limit), pausar jobs e aplicar rollback.</div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default System;
