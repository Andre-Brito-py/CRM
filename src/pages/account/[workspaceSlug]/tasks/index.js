import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
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
  const pageSize = 25;

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
      <Meta title={`Nextacular - ${workspace?.name} | ${t('Tasks')}`} />
      <OnboardingTour tourId="tasks-tour" steps={taskSteps} />
      <Content.Title
        title={t('Tasks')}
        subtitle={t('tasks.subtitle')}
      />
      <Content.Divider />
      <Content.Container>
        <div id="tasks-content">
          <div className="flex justify-end mb-4">
            <button
              id="add-task-btn"
              className="premium-button flex items-center"
              onClick={toggleModal}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('tasks.add')}
            </button>
          </div>
          {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 font-medium tracking-wide">{t('tasks.loading')}</p>
          </div>
        ) : rows.length > 0 ? (
          <>
            <div className="overflow-x-auto mt-4 hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                      {t('tasks.columns.title')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                      {t('tasks.columns.priority')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                      {t('tasks.columns.dueDate')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                    >
                      {t('tasks.columns.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/account/${workspace.slug}/tasks/${task.id}`}>
                          <a className="text-sm font-medium text-blue-600 hover:text-blue-900">
                            {task.title}
                          </a>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(locale) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {task.isCompleted ? t('tasks.status.completed') : t('tasks.status.pending')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-4 md:hidden">
              {rows.map((task) => (
                <div key={task.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <Link href={`/account/${workspace.slug}/tasks/${task.id}`}>
                      <a className="text-sm font-medium text-blue-600 hover:text-blue-900 line-clamp-2">
                        {task.title}
                      </a>
                    </Link>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                    <div>
                      <span className="block text-xs text-gray-400">{t('tasks.columns.dueDate')}</span>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString(locale) : '-'}
                    </div>
                    <div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {task.isCompleted ? t('tasks.status.completed') : t('tasks.status.pending')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {meta && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Page {meta.page} of {meta.totalPages} • {meta.total} total
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50"
                    disabled={!canGoPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50"
                    disabled={!canGoNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 mt-8 border-2 border-dashed border-gray-300 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">{t('tasks.empty.title')}</h3>
            <p className="mt-1 text-gray-500">{t('tasks.empty.subtitle')}</p>
            <button
              className="mt-4 flex items-center px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
              onClick={toggleModal}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('tasks.add')}
            </button>
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
