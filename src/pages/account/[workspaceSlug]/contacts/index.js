import { useMemo, useState } from 'react';
import { PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import Link from 'next/link';
import useContacts from '@/hooks/data/useContacts';
import { useWorkspace } from '@/providers/workspace';
import AddContactModal from '@/sections/contacts/AddContactModal';
import { useTranslation } from 'react-i18next';

const Contacts = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useContacts(workspace?.slug, { page, pageSize });
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);
  const meta = data?.meta || null;

  const canGoPrev = page > 1;
  const canGoNext = Boolean(meta?.hasMore);

  const contacts = useMemo(() => data?.contacts || [], [data?.contacts]);

  const contactSteps = [
    {
      element: '#contacts-table',
      popover: {
        title: t('onboarding.tour.contacts.step1.title'),
        description: t('onboarding.tour.contacts.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#add-contact-btn',
      popover: {
        title: t('onboarding.tour.contacts.step2.title'),
        description: t('onboarding.tour.contacts.step2.desc'),
        position: 'left',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="contacts-tour" steps={contactSteps} />
      <Meta title={`Vysify - ${workspace?.name} | Contacts`} />
      <Content.Title
        title={t('Contacts')}
        subtitle="Manage your leads and customers"
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
          <a
            href={workspace?.slug ? `/api/workspace/${workspace.slug}/export?format=csv&entity=contacts` : '#'}
            className="flex items-center justify-center px-6 py-3 text-zinc-600 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 shadow-sm font-medium text-sm group disabled:opacity-50"
            onClick={(e) => {
              if (!workspace?.slug) e.preventDefault();
            }}
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            Export CSV
          </a>
          <button
            className="flex items-center justify-center px-8 py-3 text-white bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all duration-300 shadow-xl shadow-zinc-900/20 active:scale-95 font-bold text-sm"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2 stroke-[3]" />
            Add Contact
          </button>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 font-medium tracking-wide italic">Loading your executive connections...</p>
          </div>
        ) : contacts.length > 0 ? (
          <div id="contacts-table" className="premium-card overflow-hidden">
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
                {contacts.map((contact) => (
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

        {meta && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">
              Page {meta.page} of {meta.totalPages} • {meta.total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 disabled:opacity-50"
                disabled={!canGoPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 disabled:opacity-50"
                disabled={!canGoNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Content.Container>
      <AddContactModal isOpen={isModalOpen} toggle={toggleModal} slug={workspace?.slug} />
    </AccountLayout>
  );
};

export default Contacts;
