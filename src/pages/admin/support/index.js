import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import { format } from 'date-fns';

const AdminSupportTickets = () => {
  const [filter, setFilter] = useState('');
  const { data, error, mutate } = useSWR(`/api/admin/support${filter ? `?status=${filter}` : ''}`, fetcher);
  
  const tickets = data?.tickets || [];
  const isLoading = !data && !error;

  return (
    <AdminLayout>
      <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Support Tickets</h1>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
            >
              <option value="">All Tickets</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {isLoading ? (
             <div className="p-4 text-center text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
             <div className="p-4 text-center text-gray-500">No tickets found.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link href={`/admin/support/${ticket.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-brand-600 truncate">
                          {ticket.subject || 'Ticket'}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${ticket.status === 'OPEN' ? 'bg-red-100 text-red-800' : 
                              ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}`}>
                            {ticket.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Creator: {ticket.createdBy?.name || ticket.createdBy?.email}
                            {ticket.workspace && ` (${ticket.workspace.name})`}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Updated on <time dateTime={ticket.updatedAt}>{format(new Date(ticket.updatedAt), 'PPp')}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupportTickets;
