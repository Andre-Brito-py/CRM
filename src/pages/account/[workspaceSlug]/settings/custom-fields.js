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

const CustomFields = ({ workspace }) => {
  const { setWorkspace } = useWorkspace();
  const [fields, setFields] = useState(workspace.customFieldDefinitions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Auto-generate key from label if key is empty
    if (key === 'label' && !newFields[index].key) {
      newFields[index].key = value.toLowerCase().replace(/\s+/g, '_');
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
      <Meta title={`Nextacular - ${workspace.name} | Custom Fields`} />
      <Content.Title
        title="Custom Fields"
        subtitle="Define custom fields for your contacts"
      />
      <Content.Divider />
      <Content.Container>
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-md bg-gray-50">
                  <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, 'label', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. Birthday"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Key (Internal)</label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateField(index, 'key', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. birthday"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, 'type', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                      </select>
                    </div>
                    {field.type === 'select' && (
                      <div className="sm:col-span-3">
                         <label className="block text-sm font-medium text-gray-700">Options (comma separated)</label>
                         <input
                          type="text"
                          value={field.options || ''}
                          onChange={(e) => updateField(index, 'options', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="Option 1, Option 2"
                        />
                      </div>
                    )}
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

  if (!session || !workspace) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      workspace,
    },
  };
};

export default CustomFields;
