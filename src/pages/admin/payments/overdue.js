import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const formatMoney = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(
    Number(value || 0)
  );

const OverduePayments = () => {
  const { data: session } = useSession();
  const { data, error } = useSWR(session ? '/api/admin/payments/overdue' : null, fetcher);

  const payments = data?.data?.payments || [];
  const summary = data?.data?.summary || { count: 0, totalValue: 0 };
  const isLoading = !data && !error;

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Pagamentos em atraso</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/payments" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Pagamentos
            </Link>
            <Link href="/admin/payments/forecast" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Previsão
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-white shadow sm:rounded-md p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Atrasados</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{summary.count}</div>
              </div>
              <div className="bg-white shadow sm:rounded-md p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Valor total</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{formatMoney(summary.totalValue)}</div>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : payments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Nenhum pagamento em atraso encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Workspace
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Negócio
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vencimento
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => {
                        const link = payment.invoiceUrl || payment.paymentUrl || null;
                        return (
                          <tr key={payment.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{payment.workspace?.name || '-'}</div>
                              <div className="text-xs text-gray-500">{payment.workspace?.slug || payment.workspace?.id || ''}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{payment.contact?.name || '-'}</div>
                              <div className="text-xs text-gray-500">{payment.contact?.email || payment.contact?.phone || ''}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.deal?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {payment.dueDate ? format(new Date(payment.dueDate), 'P') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-50 text-red-700">
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              {formatMoney(payment.value)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-600 hover:text-brand-700 font-medium"
                                >
                                  Abrir
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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

export default OverduePayments;
