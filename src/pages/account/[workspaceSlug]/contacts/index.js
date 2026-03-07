import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
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
        subtitle="Manage your customers and leads"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-end">
          <button
            className="flex items-center px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Contact
          </button>
        </div>
        {isLoading ? (
          <p>Loading contacts...</p>
        ) : data?.contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Phone
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Job Title
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {contact.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{contact.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{contact.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {contact.jobTitle}
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
