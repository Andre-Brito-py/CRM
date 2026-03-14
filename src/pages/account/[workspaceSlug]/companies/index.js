import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useTranslation } from 'react-i18next';
import useCompanies from '@/hooks/data/useCompanies';
import { useWorkspace } from '@/providers/workspace';
import AddCompanyModal from '@/sections/companies/AddCompanyModal';

const Companies = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { data, isLoading } = useCompanies(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);

  const companySteps = [
    {
      element: '#companies-table',
      popover: {
        title: t('onboarding.tour.companies.step1.title'),
        description: t('onboarding.tour.companies.step1.desc'),
        position: 'bottom',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="companies-tour" steps={companySteps} />
      <Meta title={`Closify - ${workspace?.name} | Companies`} />
      <Content.Title
        title={t('Companies')}
        subtitle="Manage business accounts and organizations"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-end mb-4">
          <button
            id="add-company-btn"
            className="flex items-center px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Company
          </button>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 font-medium tracking-wide italic">Retrieving business directory...</p>
          </div>
        ) : data?.companies.length > 0 ? (
          <div id="companies-table" className="overflow-x-auto">
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
