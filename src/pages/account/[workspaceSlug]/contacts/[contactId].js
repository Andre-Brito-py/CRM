import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import useContact from '@/hooks/data/useContact';
import useTags from '@/hooks/data/useTags';
import useTasks from '@/hooks/data/useTasks';
import AddTaskModal from '@/sections/tasks/AddTaskModal';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import { getWorkspace } from '@/prisma/services/workspace';
import { useTranslation } from 'react-i18next';

const ContactDetails = ({ workspace }) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { workspaceSlug, contactId } = router.query;
  const { setWorkspace } = useWorkspace();
  const { contact, isLoading, mutate } = useContact(workspaceSlug, contactId);
  const { tags: allTags, mutate: mutateTags } = useTags(workspaceSlug);
  const { tasks } = useTasks(workspaceSlug, { contactId });
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const toggleAddTaskModal = () => setAddTaskModalOpen(!isAddTaskModalOpen);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [activityForm, setActivityForm] = useState({
    type: 'NOTE',
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const locale = (i18n?.language || 'en').split('-')[0] === 'pt' ? 'pt-BR' : (i18n?.language || 'en');

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace);
    }
  }, [workspace, setWorkspace]);

  const toggleEditCustomFields = () => {
    if (editingCustomFields) {
      // Cancel
      setEditingCustomFields(false);
      setCustomFieldValues({});
    } else {
      // Start editing
      setCustomFieldValues(contact.customFields || {});
      setEditingCustomFields(true);
    }
  };

  const saveCustomFields = async () => {
    try {
      await api(`/api/workspace/${workspaceSlug}/contacts/${contactId}`, {
        method: 'PUT',
        body: { customFields: customFieldValues },
      });
      mutate();
      toast.success(t('contacts.customFields.updated'));
      setEditingCustomFields(false);
    } catch (error) {
      toast.error(t('contacts.customFields.updateFailed'));
    }
  };

  const saveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/contacts/${contactId}/activities`, {
        method: 'POST',
        body: activityForm,
      });
      mutate();
      toast.success(t('contacts.activities.added'));
      setIsAddingActivity(false);
      setActivityForm({
        type: 'NOTE',
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      toast.error(t('contacts.activities.addFailed'));
    }
  };

  const handleCustomFieldChange = (key, value) => {
    setCustomFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const addTag = async (tagId) => {
    try {
      await api(`/api/workspace/${workspaceSlug}/contacts/${contactId}`, {
        method: 'PUT',
        body: { tags: { connect: [{ id: tagId }] } },
      });
      mutate();
      toast.success(t('contacts.tags.added'));
      setIsAddingTag(false);
    } catch (error) {
      toast.error(t('contacts.tags.addFailed'));
    }
  };

  const createAndAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const { data } = await api(`/api/workspace/${workspaceSlug}/tags`, {
        method: 'POST',
        body: { name: newTagName, color: 'BLUE' },
      });
      await addTag(data.tag.id);
      setNewTagName('');
      mutateTags();
    } catch (error) {
      toast.error(t('contacts.tags.createFailed'));
    }
  };

  const removeTag = async (tagId) => {
    try {
      await api(`/api/workspace/${workspaceSlug}/contacts/${contactId}`, {
        method: 'PUT',
        body: { tags: { disconnect: [{ id: tagId }] } },
      });
      mutate();
      toast.success(t('contacts.tags.removed'));
    } catch (error) {
      toast.error(t('contacts.tags.removeFailed'));
    }
  };

  const availableTags = allTags?.filter(
    (tag) => !contact?.tags?.some((t) => t.id === tag.id)
  );

  if (isLoading) {
    return (
      <AccountLayout>
        <Content.Container>{t('common.loading')}</Content.Container>
      </AccountLayout>
    );
  }

  if (!contact) {
    return (
      <AccountLayout>
        <Content.Container>{t('contacts.notFound')}</Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${contact.name}`} />
      <Content.Title
        title={contact.name}
        subtitle={contact.jobTitle || t('contacts.noJobTitle')}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{t('contacts.details.title')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t('common.label.email')}</label>
                  <div className="mt-1 text-sm text-gray-900">{contact.email || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t('contacts.details.phone')}</label>
                  <div className="mt-1 text-sm text-gray-900">{contact.phone || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">{t('contacts.details.company')}</label>
                  <div className="mt-1 text-sm text-gray-900">{contact.company?.name || '-'}</div>
                </div>
                {/* Custom Fields Section */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{t('contacts.customFields.title')}</h4>
                    {!editingCustomFields ? (
                      <button
                        onClick={toggleEditCustomFields}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {t('common.action.edit')}
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={toggleEditCustomFields}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          {t('common.action.cancel')}
                        </button>
                        <button
                          onClick={saveCustomFields}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('common.label.save')}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingCustomFields ? (
                    <div className="space-y-3">
                      {workspace.customFieldDefinitions?.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-gray-500 capitalize">{field.label}</label>
                          {field.type === 'select' ? (
                            <select
                              value={customFieldValues[field.key] || ''}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                              className="mt-1 block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                            >
                              <option value="">Select...</option>
                              {field.options?.split(',').map(opt => (
                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={customFieldValues[field.key] || ''}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                              className="mt-1 block w-full py-1 px-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                            />
                          )}
                        </div>
                      ))}
                      {(!workspace.customFieldDefinitions || workspace.customFieldDefinitions.length === 0) && (
                        <p className="text-xs text-gray-500">{t('contacts.customFields.noneDefined')}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      {contact.customFields && Object.keys(contact.customFields).length > 0 ? (
                        Object.entries(contact.customFields).map(([key, value]) => {
                          const definition = workspace.customFieldDefinitions?.find(d => d.key === key);
                          return (
                            <div key={key} className="mb-2">
                              <label className="block text-xs font-medium text-gray-500 capitalize">
                                {definition ? definition.label : key}
                              </label>
                              <div className="text-sm text-gray-900">{value}</div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-zinc-400 font-medium">{t('contacts.customFields.empty')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t('contacts.tags.title')}</h3>
                <button
                  onClick={() => setIsAddingTag(!isAddingTag)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> {t('common.action.add')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {contact.tags?.length > 0 ? (
                  contact.tags.map(tag => (
                    <span key={tag.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group">
                      {tag.name}
                      <button
                        onClick={() => removeTag(tag.id)}
                        className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">{t('contacts.tags.empty')}</span>
                )}
              </div>

              {isAddingTag && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('contacts.tags.addTitle')}</h4>

                  {/* Existing Tags */}
                  {availableTags?.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">{t('contacts.tags.selectExisting')}</label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => addTag(tag.id)}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Tag */}
                  <form onSubmit={createAndAddTag} className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">{t('contacts.tags.orCreateNew')}</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder={t('contacts.tags.newNamePlaceholder')}
                        className="flex-1 min-w-0 block w-full px-3 py-1 rounded-l-md sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-1 border border-l-0 border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('common.action.create')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tasks and Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tasks Section */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t('Tasks')}</h3>
                <button
                  onClick={toggleAddTaskModal}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> {t('common.action.add')}
                </button>
              </div>
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {tasks?.map((task, taskIdx) => (
                    <li key={task.id}>
                      <div className="relative pb-8">
                        {taskIdx !== tasks.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${task.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            >
                              <span className="text-xs text-white font-bold">T</span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <Link href={`/account/${workspaceSlug}/tasks/${task.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                                {task.title}
                              </Link>
                              <p className="text-sm text-gray-500">
                                {task.dueDate
                                  ? t('contacts.tasks.due', { date: new Date(task.dueDate).toLocaleDateString(locale) })
                                  : t('contacts.tasks.noDueDate')}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {task.priority}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {(!tasks || tasks.length === 0) && (
                    <p className="text-sm text-gray-500">{t('contacts.tasks.empty')}</p>
                  )}
                </ul>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t('contacts.activities.title')}</h3>
                <button
                  onClick={() => setIsAddingActivity(!isAddingActivity)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> {t('contacts.activities.log')}
                </button>
              </div>

              {isAddingActivity && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{t('contacts.activities.logNew')}</h4>
                  <form onSubmit={saveActivity} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">{t('contacts.activities.form.type')}</label>
                        <select
                          value={activityForm.type}
                          onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="NOTE">{t('contacts.activities.type.note')}</option>
                          <option value="CALL">{t('contacts.activities.type.call')}</option>
                          <option value="MEETING">{t('contacts.activities.type.meeting')}</option>
                          <option value="EMAIL">{t('common.label.email')}</option>
                          <option value="TASK">{t('Tasks')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">{t('contacts.activities.form.date')}</label>
                        <input
                          type="date"
                          value={activityForm.date}
                          onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">{t('contacts.activities.form.title')}</label>
                      <input
                        type="text"
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                        placeholder={t('contacts.activities.form.titlePlaceholder')}
                        required
                        className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">{t('contacts.activities.form.details')}</label>
                      <textarea
                        rows={3}
                        value={activityForm.content}
                        onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                        placeholder={t('contacts.activities.form.detailsPlaceholder')}
                        className="mt-1 block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingActivity(false)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('common.action.cancel')}
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('contacts.activities.save')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {contact.activities?.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== contact.activities.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                              {/* Icon based on activity type */}
                              <span className="text-xs text-white font-bold">{activity.type ? activity.type[0] : 'A'}</span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {activity.title}{' '}
                                <span className="font-medium text-gray-900">
                                  {t('common.byName', { name: activity.user?.name || t('common.system') })}
                                </span>
                              </p>
                              {activity.content && (
                                <p className="mt-1 text-sm text-gray-600">{activity.content}</p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleDateString(locale)}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {(!contact.activities || contact.activities.length === 0) && (
                    <p className="text-sm text-gray-500">{t('contacts.activities.empty')}</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Content.Container>
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        toggle={toggleAddTaskModal}
        slug={workspaceSlug}
        initialContactId={contactId}
      />
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );
  }

  return {
    props: {
      workspace,
    },
  };
};

export default ContactDetails;
