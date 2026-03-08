import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { CreditCardIcon } from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';

const Payments = () => {
  const { data: session } = useSession();
  const { data, error } = useSWR(session ? '/api/admin/payments' : null, fetcher);

  const payments = data?.data?.payments || [];
  const isLoading = !data && !error;

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No payments found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.subscriptionType === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' : 
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
