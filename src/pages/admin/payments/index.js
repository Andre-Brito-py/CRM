import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';

const Payments = () => {
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR(session ? '/api/admin/payments' : null, fetcher);
  const [reconcileQuery, setReconcileQuery] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const payments = data?.data?.payments || [];
  const isLoading = !data && !error;

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Pagamentos</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/payments/overdue" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Atrasados
            </Link>
            <Link href="/admin/payments/forecast" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Previsão
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="bg-white shadow sm:rounded-md p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Reconciliar (Stripe)</label>
                  <input
                    type="text"
                    value={reconcileQuery}
                    onChange={(e) => setReconcileQuery(e.target.value)}
                    placeholder="customerPaymentId, email ou Stripe customer id"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={!reconcileQuery.trim() || reconciling}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  onClick={async () => {
                    const q = reconcileQuery.trim();
                    if (!q) return;
                    setReconciling(true);
                    try {
                      toast.loading('Reconciliando...', { id: 'reconcile' });
                      const payload = q.includes('@')
                        ? { email: q }
                        : q.startsWith('cus_')
                          ? { paymentId: q }
                          : { customerPaymentId: q };
                      const res = await api('/api/admin/payments', { method: 'POST', body: payload });
                      if (res?.error?.msg) throw new Error(res.error.msg);
                      toast.success('Reconciliação concluída', { id: 'reconcile' });
                      mutate();
                    } catch (e) {
                      toast.error(e?.message || 'Falha na reconciliação', { id: 'reconcile' });
                    } finally {
                      setReconciling(false);
                    }
                  }}
                >
                  {reconciling ? 'Reconciliando...' : 'Reconciliar'}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Atualiza o subscriptionType local consultando o Stripe (logado em auditoria).
              </div>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : payments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Nenhum pagamento encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plano
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {payment.customer.image ? (
                                  <img className="h-10 w-10 rounded-full" src={payment.customer.image} alt="" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                    {payment.customer.name?.[0] || 'C'}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{payment.customer.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{payment.customer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.subscriptionType === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' :
                              payment.subscriptionType === 'STANDARD' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {payment.subscriptionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.paymentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.createdAt ? format(new Date(payment.createdAt), 'PP p') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Payments;
