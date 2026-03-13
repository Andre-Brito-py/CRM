import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { CheckCircleIcon, XCircleIcon, CpuChipIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import formatDistance from 'date-fns/formatDistance';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const System = () => {
  const { data: session } = useSession();
  const { data } = useSWR(session ? '/api/admin/system/health' : null, fetcher, {
    refreshInterval: 5000,
  });

  const health = data?.data;
  const isLoading = !data;

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
