import { useState } from 'react';
import { PlusIcon, CalendarIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import useTasks from '@/hooks/data/useTasks';
import { useWorkspace } from '@/providers/workspace';
import AddTaskModal from '@/sections/tasks/AddTaskModal';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const Tasks = () => {
  const { t, i18n } = useTranslation();
  const { workspace } = useWorkspace();
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { tasks, meta, isLoading } = useTasks(workspace?.slug, { page, pageSize });
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);
  const locale = (i18n?.language || 'en').split('-')[0] === 'pt' ? 'pt-BR' : (i18n?.language || 'en');
  const rows = tasks || [];
  const canGoPrev = page > 1;
  const canGoNext = Boolean(meta?.hasMore);

  const taskSteps = [
    {
      element: '#tasks-content',
      popover: {
        title: t('onboarding.tour.tasks.step1.title'),
        description: t('onboarding.tour.tasks.step1.desc'),
        position: 'bottom',
      }
    }
  ];

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace?.name} | ${t('Tasks')}`} />
      <OnboardingTour tourId="tasks-tour" steps={taskSteps} />
      
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter uppercase italic leading-none mb-4">
            {t('Tasks')}
          </h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-lg font-medium italic tracking-tight opacity-80">
            {t('tasks.subtitle') || 'Strategic Operations & Priority Protocols'}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          id="add-task-btn"
          className="flex items-center px-10 py-4 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-3xl shadow-indigo-600/20 italic group"
          onClick={toggleModal}
        >
          <PlusIcon className="w-5 h-5 mr-3 transition-transform group-hover:rotate-90" />
          {t('tasks.add') || 'Initiate Protocol'}
        </motion.button>
      </div>

      <Content.Container>
        <div id="tasks-content">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] animate-pulse"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-[2.5rem] animate-spin"></div>
              </div>
              <p className="mt-10 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em] italic animate-pulse">Synchronizing Action Items...</p>
            </div>
          ) : rows.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rows.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={`/account/${workspace.slug}/tasks/${task.id}`}>
                      <a className="block group">
                        <div className="vysify-glass p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800/50 shadow-premium hover:shadow-3xl transition-all duration-500 relative overflow-hidden group-hover:-translate-y-2">
                          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-16 -mt-16 opacity-10 transition-colors ${
                            task.priority === 'HIGH' ? 'bg-rose-500' : task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          
                          <div className="flex items-center justify-between mb-8">
                            <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] italic border ${
                              task.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                              task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}>
                              {task.priority} PRIORITY
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                              <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </div>

                          <h3 className="text-[18px] font-executive font-extrabold text-zinc-950 dark:text-white uppercase tracking-tight italic mb-6 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </h3>

                          <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-6">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Deadline</span>
                              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="text-[12px] font-bold italic tabular-nums">
                                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString(locale) : 'TBD'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 items-end">
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic text-right">Operational Status</span>
                              <div className={`flex items-center gap-2 ${task.isCompleted ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                {task.isCompleted ? (
                                  <>
                                    <span className="text-[12px] font-black uppercase italic">Secured</span>
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[12px] font-black uppercase italic">Pending</span>
                                    <ClockIcon className="w-4 h-4" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {meta && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-12 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic mb-1">DATA STREAM PAGINATION</span>
                    <div className="text-[13px] font-medium text-zinc-500 italic tracking-tight">
                      Showing Page <span className="text-zinc-950 dark:text-white font-black">{meta.page}</span> of <span className="text-zinc-950 dark:text-white font-black">{meta.totalPages}</span> • {meta.total} Total Protocols
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className="px-8 py-4 rounded-[1.5rem] vysify-glass text-[11px] font-black uppercase tracking-[0.2em] italic border border-zinc-100 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      disabled={!canGoPrev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className="px-8 py-4 rounded-[1.5rem] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11px] font-black uppercase tracking-[0.2em] italic disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl"
                      disabled={!canGoNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-32 h-32 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-premium flex items-center justify-center border border-zinc-100 dark:border-zinc-800 mb-10 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-6"
              >
                <CheckCircleIcon className="w-12 h-12 text-zinc-100 dark:text-zinc-800" />
              </motion.div>
              <h3 className="text-3xl font-executive font-extrabold text-zinc-950 dark:text-white uppercase tracking-tighter italic mb-4">{t('tasks.empty.title') || 'Operations Status: Clear'}</h3>
              <p className="text-zinc-400 dark:text-zinc-500 text-lg font-medium italic tracking-tight mb-12 max-w-md mx-auto">{t('tasks.empty.subtitle') || 'All protocols have been executed. Your operational queue is currently empty.'}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleModal}
                className="p-6 bg-indigo-600 text-white rounded-[2rem] shadow-glow-indigo transition-all"
              >
                <PlusIcon className="w-8 h-8" />
              </motion.button>
            </div>
          )}
        </div>
      </Content.Container>
      <AddTaskModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        slug={workspace?.slug}
      />
    </AccountLayout>
  );
};

export default Tasks;
