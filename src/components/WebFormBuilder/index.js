import { useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { mutate } from 'swr';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'email', label: 'Email Address' },
  { value: 'tel', label: 'Phone Number' },
  { value: 'textarea', label: 'Long Text' },
];

const STANDARD_MAPPINGS = [
  { value: '', label: '-- Custom Field --' },
  { value: 'name', label: 'Contact Name' },
  { value: 'email', label: 'Contact Email' },
  { value: 'phone', label: 'Contact Phone' },
  { value: 'jobTitle', label: 'Job Title' },
];

const WebFormBuilder = ({ show, toggle, form }) => {
  const { workspace } = useWorkspace();
  const [config, setConfig] = useState(form?.config || []);
  const [isSaving, setIsSaving] = useState(false);

  // When form changes, reset the config (if same component instance is reused)
  // Actually handled by React if key changes, but safe to sync
  import { useEffect } from 'react';
  useEffect(() => {
    setConfig(form?.config || []);
  }, [form]);

  if (!form) return null;

  const handleAddField = () => {
    setConfig([
      ...config,
      {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        label: 'New Field',
        required: false,
        mapsTo: '', // If empty, it's considered a customField
      },
    ]);
  };

  const handleUpdateField = (index, updates) => {
    const newConfig = [...config];
    newConfig[index] = { ...newConfig[index], ...updates };
    setConfig(newConfig);
  };

  const handleRemoveField = (index) => {
    const newConfig = [...config];
    newConfig.splice(index, 1);
    setConfig(newConfig);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api(`/api/workspace/${workspace.slug}/web-forms/${form.id}`, {
        method: 'PUT',
        body: { config },
      });
      toast.success('Form fields saved!');
      mutate(`/api/workspace/${workspace.slug}/web-forms`);
      toggle();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error saving fields');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} toggle={toggle} title={`Edit Fields - ${form.name}`}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto w-full p-2">
        {config.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 border border-dashed text-gray-500 rounded">
            No fields yet. Add a field to start building your form.
          </div>
        ) : (
          config.map((field, idx) => (
            <div key={field.id || idx} className="p-4 bg-white border rounded shadow-sm relative space-y-3">
              <button
                type="button"
                onClick={() => handleRemoveField(idx)}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
              
              <div className="grid grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                    className="mt-1 block w-full text-sm border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Field Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => handleUpdateField(idx, { type: e.target.value })}
                    className="mt-1 block w-full text-sm border-gray-300 rounded shadow-sm p-2 border"
                  >
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Map to Contact Property</label>
                  <select
                    value={field.mapsTo}
                    onChange={(e) => handleUpdateField(idx, { mapsTo: e.target.value })}
                    className="mt-1 block w-full text-sm border-gray-300 rounded shadow-sm p-2 border"
                  >
                    {STANDARD_MAPPINGS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">If "Custom Field" is selected, the label is used as key.</p>
                </div>
                <div className="flex items-center pt-5">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Required Field</label>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={handleAddField}
          className="flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Field
        </button>

        <div className="flex space-x-2">
          <button type="button" onClick={toggle} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Fields'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WebFormBuilder;
