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
import { motion, AnimatePresence } from 'framer-motion';

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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">Customer Base</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              {t('Contacts')} <span className="text-indigo-600">Engine</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed">
              Manage your high-value leads and strategic executive connections.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/account/${workspace?.slug}/contacts/import`}
              className="flex items-center px-6 py-3.5 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-premium-sm font-black text-[10px] uppercase tracking-widest italic"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Import CSV
            </Link>
            <a
              href={workspace?.slug ? `/api/workspace/${workspace.slug}/export?format=csv&entity=contacts` : '#'}
              className="flex items-center px-6 py-3.5 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600 transition-all shadow-premium-sm font-black text-[10px] uppercase tracking-widest italic group"
              onClick={(e) => {
                if (!workspace?.slug) e.preventDefault();
              }}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export CSV
            </a>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center px-8 py-3.5 text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/25 font-black text-[11px] uppercase tracking-widest italic"
              onClick={toggleModal}
            >
              <PlusIcon className="w-5 h-5 mr-3 stroke-[3]" />
              Add Contact
            </motion.button>
          </div>
        </motion.div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
              <div className="w-16 h-16 border-[5px] border-zinc-100 dark:border-zinc-800 border-t-indigo-600 rounded-full animate-spin relative z-10"></div>
            </div>
            <p className="text-zinc-400 font-black text-[10px] tracking-[0.3em] uppercase italic mt-10 animate-pulse">Synchronizing Connections</p>
          </div>
        ) : contacts.length > 0 ? (
          <motion.div 
            id="contacts-table" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vysify-glass rounded-[2.5rem] overflow-hidden border border-zinc-100/50 dark:border-zinc-800/50 shadow-2xl"
          >
            <table className="min-w-full divide-y divide-zinc-50 dark:divide-zinc-800/30">
              <thead className="bg-zinc-50/30 dark:bg-zinc-900/30 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Contact Name</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Email Address</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Mobile</th>
                  <th scope="col" className="px-10 py-6 text-[10px] font-black tracking-[0.25em] text-left text-zinc-400 uppercase italic">Job Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/30">
                <AnimatePresence>
                  {contacts.map((contact, idx) => (
                    <motion.tr 
                      key={contact.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group cursor-pointer"
                    >
                      <td className="px-10 py-6 whitespace-nowrap">
                        <Link
                          href={`/account/${workspace.slug}/contacts/${contact.id}`}
                          className="text-[15px] font-executive font-extrabold text-zinc-950 dark:text-white group-hover:text-indigo-600 transition-colors uppercase italic tracking-tight"
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 font-mono">{contact.email}</div>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{contact.phone}</div>
                      </td>
                      <td className="px-10 py-6 whitespace-nowrap">
                        <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50 inline-block italic">
                          {contact.jobTitle || 'EXECUTIVE'}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        ) : (
          <div className="vysify-glass p-20 text-center rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800/50">
            <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic tracking-tight mb-3">
              No Executive <span className="text-zinc-400 font-medium">Found</span>
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed italic">
              Populate your CRM with the players that matter most to your business success.
            </p>
            <button
              onClick={toggleModal}
              className="inline-flex items-center px-8 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
            >
              <PlusIcon className="mr-3 h-5 w-5 stroke-[3]" aria-hidden="true" />
              Add Your First Contact
            </button>
          </div>
        )}

        {meta && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pb-12"
          >
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] bg-zinc-50/50 dark:bg-zinc-900/30 px-5 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50 italic">
              Page {meta.page} of {meta.totalPages} • Total <span className="text-indigo-600 font-extrabold">{meta.total}</span> Connections
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="px-8 py-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed italic"
                disabled={!canGoPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="px-8 py-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed italic"
                disabled={!canGoNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </motion.div>
        )}
      </div>
      <AddContactModal isOpen={isModalOpen} toggle={toggleModal} slug={workspace?.slug} />
    </AccountLayout>
  );
};

export default Contacts;
