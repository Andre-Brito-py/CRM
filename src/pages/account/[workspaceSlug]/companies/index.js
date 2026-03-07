import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import useCompanies from '@/hooks/data/useCompanies';
import { useWorkspace } from '@/providers/workspace';
import AddCompanyModal from '@/sections/companies/AddCompanyModal';

const Companies = () => {
  const { workspace } = useWorkspace();
  const { data, isLoading } = useCompanies(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | Companies`} />
      <Content.Title
        title="Companies"
        subtitle="Manage your business accounts"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-end">
          <button
            className="flex items-center px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Company
          </button>
        </div>
        {isLoading ? (
          <p>Loading companies...</p>
        ) : data?.companies.length > 0 ? (
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
                    Website
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Industry
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Contacts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {company.website}
                          </a>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {company.industry || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {company.contacts?.length || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Content.Empty>
            No companies found. Start by adding a new company.
          </Content.Empty>
        )}
      </Content.Container>
      <AddCompanyModal isOpen={isModalOpen} toggle={toggleModal} slug={workspace?.slug} />
    </AccountLayout>
  );
};

export default Companies;
