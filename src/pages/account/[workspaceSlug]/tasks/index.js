import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
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
  const { data, isLoading } = useTasks(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);
  const locale = (i18n?.language || 'en').split('-')[0] === 'pt' ? 'pt-BR' : (i18n?.language || 'en');

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | ${t('Tasks')}`} />
      <Content.Title
        title={t('Tasks')}
        subtitle={t('tasks.subtitle')}
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            className="flex items-center justify-center w-full sm:w-auto px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('tasks.add')}
          </button>
        </div>
        {isLoading ? (
          <p className="mt-4 text-center text-gray-500">{t('tasks.loading')}</p>
        ) : data?.tasks.length > 0 ? (
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
                  {data.tasks.map((task) => (
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
              {data.tasks.map((task) => (
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
