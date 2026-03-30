import { useState } from 'react';
import { PlusIcon, BuildingOffice2Icon, GlobeAltIcon, TagIcon, UsersIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
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
      <Meta title={`Vysify - ${workspace?.name} | Business Directory`} />
      
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter uppercase italic leading-none mb-4">
            {t('Companies')}
          </h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-lg font-medium italic tracking-tight opacity-80">
            Strategic Business Intelligence & Enterprise Accounts
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          id="add-company-btn"
          className="flex items-center px-10 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-3xl shadow-indigo-600/20 italic group"
          onClick={toggleModal}
        >
          <PlusIcon className="w-5 h-5 mr-3 transition-transform group-hover:rotate-90" />
          Register Enterprise
        </motion.button>
      </div>

      <Content.Container>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-zinc-100 dark:border-zinc-800 rounded-[2rem] animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-[2rem] animate-spin"></div>
            </div>
            <p className="mt-8 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em] italic animate-pulse">Synchronizing Directory...</p>
          </div>
        ) : data?.companies.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            id="companies-table" 
            className="vysify-glass rounded-[3rem] overflow-hidden border border-zinc-100 dark:border-zinc-800/50 shadow-premium"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <thead className="bg-zinc-50/50 dark:bg-zinc-950/50">
                  <tr>
                    <th scope="col" className="px-10 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] font-display italic">Enterprise Identity</th>
                    <th scope="col" className="px-10 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] font-display italic">Digital Presence</th>
                    <th scope="col" className="px-10 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] font-display italic">Segment</th>
                    <th scope="col" className="px-10 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] font-display italic text-center">Protocol Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {data.companies.map((company, idx) => (
                    <motion.tr 
                      key={company.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-10 py-8 whitespace-nowrap">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3">
                            <BuildingOffice2Icon className="w-7 h-7 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                          <div>
                            <div className="text-[17px] font-executive font-extrabold text-zinc-950 dark:text-white uppercase tracking-tight italic">
                              {company.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-1">Verified Entity</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        {company.website ? (
                          <div className="flex items-center gap-3">
                            <GlobeAltIcon className="w-4 h-4 text-zinc-400" />
                            <a
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline tracking-tight italic"
                            >
                              {company.website.replace(/^https?:\/\//, '')}
                            </a>
                            <ArrowTopRightOnSquareIcon className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-700 font-black tracking-widest text-[10px] italic">OFFLINE</span>
                        )}
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <TagIcon className="w-4 h-4 text-zinc-400" />
                          <span className="text-[13px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-tight italic">
                            {company.industry || 'NON-CLASSIFIED'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center gap-3 px-5 py-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          <UsersIcon className="w-4 h-4" />
                          <span className="text-[12px] font-black italic tabular-nums">{company.contacts?.length || 0}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-32 h-32 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-premium flex items-center justify-center border border-zinc-100 dark:border-zinc-800 mb-10 transition-transform duration-1000 group-hover:scale-110 group-hover:-rotate-6"
            >
              <BuildingOffice2Icon className="w-12 h-12 text-zinc-100 dark:text-zinc-800" />
            </motion.div>
            <h3 className="text-3xl font-executive font-extrabold text-zinc-950 dark:text-white uppercase tracking-tighter italic mb-4">Business Repository Empty</h3>
            <p className="text-zinc-400 dark:text-zinc-500 text-lg font-medium italic tracking-tight mb-12 max-w-md mx-auto">Initiate your business directory by adding your first enterprise partner to the system.</p>
            <button
               onClick={toggleModal}
               className="p-5 bg-indigo-600 text-white rounded-2xl hover:scale-110 transition-all shadow-glow-indigo"
            >
              <PlusIcon className="w-7 h-7" />
            </button>
          </div>
        )}
      </Content.Container>
      <AddCompanyModal isOpen={isModalOpen} toggle={toggleModal} slug={workspace?.slug} />
    </AccountLayout>
  );
};

export default Companies;
