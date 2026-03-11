import { useState } from 'react';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import Link from 'next/link';
import useContacts from '@/hooks/data/useContacts';
import { useWorkspace } from '@/providers/workspace';
import AddContactModal from '@/sections/contacts/AddContactModal';

const Contacts = () => {
  const { workspace } = useWorkspace();
  const { data, isLoading } = useContacts(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | Contacts`} />
      <Content.Title
        title="Contacts"
        subtitle="Manage your customers and leads with precision"
        className="font-executive"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-end sm:items-center sm:space-y-0 sm:space-x-4 mb-8">
          <Link
            href={`/account/${workspace?.slug}/contacts/import`}
            className="flex items-center justify-center px-6 py-3 text-zinc-600 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 shadow-sm font-medium text-sm group"
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            Import CSV
          </Link>
          <button
            className="flex items-center justify-center px-8 py-3 text-white bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all duration-300 shadow-xl shadow-zinc-900/20 active:scale-95 font-bold text-sm"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2 stroke-[3]" />
            Add Contact
          </button>
        </div>
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : data?.contacts.length > 0 ? (
          <div className="premium-card overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-100">
              <thead className="bg-zinc-50/50">
                <tr>
                  <th scope="col" className="px-8 py-5 text-[11px] font-bold tracking-[0.2em] text-left text-zinc-400 uppercase font-executive">Name</th>
                  <th scope="col" className="px-8 py-5 text-[11px] font-bold tracking-[0.2em] text-left text-zinc-400 uppercase font-executive">Email</th>
                  <th scope="col" className="px-8 py-5 text-[11px] font-bold tracking-[0.2em] text-left text-zinc-400 uppercase font-executive">Phone</th>
                  <th scope="col" className="px-8 py-5 text-[11px] font-bold tracking-[0.2em] text-left text-zinc-400 uppercase font-executive">Job Title</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-50">
                {data.contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <Link
                        href={`/account/${workspace.slug}/contacts/${contact.id}`}
                        className="text-[15px] font-executive font-bold text-zinc-900 hover:text-indigo-600 transition-colors"
                      >
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-500">{contact.email}</div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-500">{contact.phone}</div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-lg inline-block">
                        {contact.jobTitle || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Content.Empty>
            No contacts found. Start by adding a new contact.
          </Content.Empty>
        )}
      </Content.Container>
      <AddContactModal isOpen={isModalOpen} toggle={toggleModal} slug={workspace?.slug} />
    </AccountLayout>
  );
};

export default Contacts;
