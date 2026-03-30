import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  Bars2Icon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
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
        mapsTo: '',
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

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(config);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setConfig(items);
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
      <div className="space-y-4 max-h-[70vh] overflow-y-auto w-full p-6 custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="form-fields">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {config.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[32px] text-center px-6">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-premium flex items-center justify-center mb-4">
                      <PlusIcon className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="font-executive font-bold text-zinc-900 border-0">No fields yet</p>
                    <p className="text-sm text-zinc-400 mt-1">Add a field to start building your form.</p>
                  </div>
                ) : (
                  config.map((field, idx) => (
                    <Draggable key={field.id || idx} draggableId={String(field.id || idx)} index={idx}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`group vysify-glass p-8 rounded-[3rem] border transition-all duration-500 ${
                            snapshot.isDragging 
                              ? 'shadow-[0_40px_100px_rgba(0,0,0,0.25)] border-indigo-500/50 ring-8 ring-indigo-500/5 rotate-2 z-50 bg-white/90 dark:bg-zinc-900/90 scale-105' 
                              : 'shadow-premium-sm border-zinc-100/50 dark:border-zinc-800/50 hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div 
                              {...provided.dragHandleProps}
                              className="mt-1 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 rounded-lg transition-colors cursor-grab active:cursor-grabbing"
                            >
                              <Bars2Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 space-y-5">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[12px] font-black text-brand-600 uppercase tracking-widest leading-none">Field #{idx + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(idx)}
                                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Label</label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                                    className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[14px] font-executive font-bold focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                                    placeholder="Enter label..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1">Field Type</label>
                                  <div className="relative">
                                    <select
                                      value={field.type}
                                      onChange={(e) => handleUpdateField(idx, { type: e.target.value })}
                                      className="w-full h-14 pl-6 pr-12 bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-bold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer font-executive uppercase italic"
                                    >
                                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <ChevronUpDownIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Property Mapping</label>
                                  <div className="relative">
                                    <select
                                      value={field.mapsTo}
                                      onChange={(e) => handleUpdateField(idx, { mapsTo: e.target.value })}
                                      className="w-full h-11 pl-4 pr-10 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium text-zinc-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all appearance-none cursor-pointer"
                                    >
                                      {STANDARD_MAPPINGS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                    <ChevronUpDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                  </div>
                                </div>
                                <div className="flex items-center pt-5 pl-1">
                                  <label className="relative flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                    <span className="ml-3 text-[13px] font-executive font-bold text-zinc-600">Mandatory</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between p-6 border-t border-zinc-100 bg-zinc-50/30">
        <button
          type="button"
          onClick={handleAddField}
          className="flex items-center justify-center px-6 py-3 text-[14px] font-executive font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-2xl hover:bg-brand-100 transition-all active:scale-95 shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Form Field
        </button>

        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={toggle} 
            className="flex-1 sm:flex-initial px-6 py-3 border border-zinc-200 rounded-2xl text-zinc-700 font-executive font-bold hover:bg-white hover:border-zinc-300 transition-all active:scale-95 shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 sm:flex-initial px-8 py-3 bg-brand-600 text-white rounded-2xl font-executive font-bold hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WebFormBuilder;
