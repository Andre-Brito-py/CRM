import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace } from '@/prisma/services/workspace';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const CustomFields = ({ workspace }) => {
  const { t } = useTranslation();
  const { setWorkspace } = useWorkspace();
  const [fields, setFields] = useState(workspace.customFieldDefinitions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customFieldsSteps = [
    {
      element: '#add-field-btn',
      popover: {
        title: t('onboarding.tour.custom_fields.step1.title'),
        description: t('onboarding.tour.custom_fields.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#fields-container',
      popover: {
        title: t('onboarding.tour.custom_fields.step2.title'),
        description: t('onboarding.tour.custom_fields.step2.desc'),
        position: 'top',
      }
    }
  ];

  useEffect(() => {
    setWorkspace(workspace);
    if (workspace.customFieldDefinitions) {
      setFields(workspace.customFieldDefinitions);
    }
  }, [workspace, setWorkspace]);

  const addField = () => {
    setFields([...fields, { key: '', label: '', type: 'text' }]);
  };

  const removeField = (index) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

    const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    // Auto-generate key from label if key is empty and we're updating the label
    if (key === 'label' && !newFields[index].key) {
      newFields[index].key = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setFields(newFields);
  };

  const saveFields = async () => {
    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspace.slug}/custom-fields`, {
        body: { customFieldDefinitions: fields },
        method: 'PUT',
      });
      toast.success('Custom fields saved successfully');
    } catch (error) {
      toast.error('Failed to save custom fields');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccountLayout>
      <OnboardingTour tourId="custom-fields-tour" steps={customFieldsSteps} />
      <Meta title={`Closify - ${workspace.name} | Custom Fields`} />
      <Content.Title
        title="Custom Fields"
        subtitle="Define custom fields for your contacts and deals"
      />
      <Content.Divider />
      <Content.Container>
        <div id="fields-container" className="bg-white dark:bg-zinc-900 shadow sm:rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="flex items-start space-x-4 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex-1 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Label</label>
                      <input
                        type="text"
                        value={field.label || ''}
                        onChange={(e) => updateField(index, 'label', e.target.value)}
                        className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g. Birthday"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Key (Internal)</label>
                      <input
                        type="text"
                        value={field.key || ''}
                        onChange={(e) => updateField(index, 'key', e.target.value)}
                        className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g. birthday"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
                      <select
                        value={field.type || 'text'}
                        onChange={(e) => updateField(index, 'type', e.target.value)}
                        className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                        <option value="select">Select (Dropdown)</option>
                        <option value="multi-select">Multi-Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="currency">Currency</option>
                        <option value="url">URL</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>

                    {(field.type === 'select' || field.type === 'multi-select') && (
                      <div className="sm:col-span-3">
                         <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Options (comma separated)</label>
                         <input
                          type="text"
                          value={field.options || ''}
                          onChange={(e) => updateField(index, 'options', e.target.value)}
                          className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Visibility (Area)</label>
                      <select
                        value={field.area || 'both'}
                        onChange={(e) => updateField(index, 'area', e.target.value)}
                        className="mt-1 block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="both">Both (Sales & Support)</option>
                        <option value="sales">Sales Only</option>
                        <option value="support">Support Only</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex items-center pt-6">
                      <div className="flex items-center h-5">
                        <input
                          id={`required-${index}`}
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(index, 'required', e.target.checked)}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`required-${index}`} className="font-medium text-zinc-700 dark:text-zinc-300">Required Field</label>
                        <p className="text-zinc-500 dark:text-zinc-400">If checked, users must fill this field when creating/editing.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeField(index)}
                    className="mt-6 text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-between">
              <button
                id="add-field-btn"
                onClick={addField}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Add Field
              </button>
              
              <button
                onClick={saveFields}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </Content.Container>
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

  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!workspace) {
    return { notFound: true };
  }

  return {
    props: {
      workspace,
    },
  };
};

export default CustomFields;
