import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  QueueListIcon,
  TagIcon,
  AdjustmentsVerticalIcon,
  SparklesIcon,
  Bars2Icon,
  CalendarIcon,
  HashtagIcon,
  ChevronDownIcon,
  CheckIcon,
  CurrencyDollarIcon,
  LinkIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const FieldTypeIcon = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case 'text': return <Bars2Icon className={className} />;
    case 'date': return <CalendarIcon className={className} />;
    case 'number': return <HashtagIcon className={className} />;
    case 'select': return <ChevronDownIcon className={className} />;
    case 'multi-select': return <QueueListIcon className={className} />;
    case 'checkbox': return <CheckIcon className={className} />;
    case 'currency': return <CurrencyDollarIcon className={className} />;
    case 'url': return <LinkIcon className={className} />;
    case 'phone': return <PhoneIcon className={className} />;
    default: return <Bars2Icon className={className} />;
  }
};

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
    setFields([...fields, { 
      key: '', 
      label: '', 
      type: 'text', 
      id: Math.random().toString(36).substr(2, 9),
      required: false,
      area: 'both'
    }]);
  };

  const removeField = (index) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    if (key === 'label' && !newFields[index].key) {
      newFields[index].key = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setFields(newFields);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
  };

  const saveFields = async () => {
    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspace.slug}/custom-fields`, {
        body: { customFieldDefinitions: fields },
        method: 'PUT',
      });
      toast.success(t('Custom fields saved successfully'));
    } catch (error) {
      toast.error(t('Failed to save custom fields'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccountLayout>
      <OnboardingTour tourId="custom-fields-tour" steps={customFieldsSteps} />
      <Meta title={`Vysify - ${workspace.name} | Custom Fields`} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <TagIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">Schema Configuration</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              Custom <span className="text-indigo-600">Properties</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed italic">
              Architect unique data structures to capture essential business insights.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="add-field-btn"
              onClick={addField}
              className="flex items-center px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-black text-[11px] uppercase tracking-widest italic rounded-2xl shadow-premium-sm hover:border-indigo-500/30 transition-all"
            >
              <PlusIcon className="w-5 h-5 mr-3 text-indigo-600 stroke-[3]" />
              New Property
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveFields}
              disabled={isSubmitting}
              className="flex items-center px-8 py-4 premium-gradient text-white font-black text-[11px] uppercase tracking-widest italic rounded-2xl shadow-xl shadow-indigo-500/25 disabled:opacity-50"
            >
               <AdjustmentsVerticalIcon className="w-5 h-5 mr-3 stroke-[3]" />
              {isSubmitting ? t('common.action.saving') : 'Sync Changes'}
            </motion.button>
          </div>
        </motion.div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="custom-fields">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                id="fields-container"
                className="space-y-4"
              >
                 {fields.length === 0 ? (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="vysify-glass p-24 text-center rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800/50"
                   >
                     <div className="relative inline-block mb-10">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
                        <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 rounded-[32px] shadow-premium flex items-center justify-center mx-auto border border-zinc-100 dark:border-zinc-800">
                          <AdjustmentsVerticalIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
                        </div>
                      </div>
                     <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic tracking-tight mb-3">
                       No Custom <span className="text-zinc-400 font-medium">Fields</span>
                     </h3>
                     <p className="text-zinc-500 font-medium font-executive max-w-sm mx-auto italic leading-relaxed">
                       Start defining unique data parameters that matter to your business scaling.
                     </p>
                   </motion.div>
                ) : (
                <AnimatePresence>
                  {fields.map((field, index) => (
                    <Draggable key={field.id || index} draggableId={String(field.id || index)} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`vysify-glass p-1 rounded-[2.5rem] transition-all duration-500 border ${
                            snapshot.isDragging 
                              ? 'shadow-2xl border-indigo-500/30 scale-[1.02] z-50' 
                              : 'border-zinc-100 dark:border-zinc-800/50 hover:shadow-2xl'
                          }`}
                        >
                          <div className="flex items-start gap-3 p-6 lg:p-8">
                            <div 
                              {...provided.dragHandleProps}
                              className="mt-1 p-3 text-zinc-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all cursor-grab active:cursor-grabbing"
                            >
                              <Bars2Icon className="w-6 h-6 stroke-[2]" />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                              <div className="lg:col-span-1">
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic font-executive">Label Name</label>
                                <input
                                  type="text"
                                  value={field.label || ''}
                                  onChange={(e) => updateField(index, 'label', e.target.value)}
                                  className="w-full h-14 px-6 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder:text-zinc-300"
                                  placeholder="e.g. BIRTHDAY"
                                />
                              </div>
                              <div className="lg:col-span-1">
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic font-executive">System Identifier</label>
                                <input
                                  type="text"
                                  value={field.key || ''}
                                  onChange={(e) => updateField(index, 'key', e.target.value)}
                                  className="w-full h-14 px-6 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-[13px] font-mono text-zinc-500 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder:text-zinc-300"
                                  placeholder="e.g. birthday_key"
                                />
                              </div>
                              <div className="lg:col-span-1">
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic font-executive">Input Archetype</label>
                                <div className="relative group/select">
                                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-600 transition-transform group-hover/select:scale-110">
                                    <FieldTypeIcon type={field.type} />
                                  </div>
                                  <select
                                    value={field.type || 'text'}
                                    onChange={(e) => updateField(index, 'type', e.target.value)}
                                    className="w-full h-14 pl-14 pr-6 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest italic cursor-pointer focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all appearance-none"
                                  >
                                    <option value="text">Standard Text</option>
                                    <option value="date">Temporal Date</option>
                                    <option value="number">Numeric Val</option>
                                    <option value="select">Single Choice</option>
                                    <option value="multi-select">Multi Selection</option>
                                    <option value="checkbox">Toggle Boolean</option>
                                    <option value="currency">Fiscal Currency</option>
                                    <option value="url">Web Resource</option>
                                    <option value="phone">Contact Phone</option>
                                  </select>
                                </div>
                              </div>
                              <div className="lg:col-span-1 flex items-center justify-end">
                                <button
                                  onClick={() => removeField(index)}
                                  className="p-4 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                                  title="Delete field"
                                >
                                  <TrashIcon className="w-6 h-6 stroke-[2]" />
                                </button>
                              </div>

                              {(field.type === 'select' || field.type === 'multi-select') && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="lg:col-span-4"
                                >
                                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic font-executive">Available Options (Comma Separated)</label>
                                  <input
                                    type="text"
                                    value={field.options || ''}
                                    onChange={(e) => updateField(index, 'options', e.target.value)}
                                    className="w-full h-14 px-6 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder:text-zinc-300"
                                    placeholder="PREMIUM, STANDARD, ENTERPRISE"
                                  />
                                </motion.div>
                              )}

                              <div className="lg:col-span-2">
                                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic font-executive">Scope Distribution</label>
                                <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-[22px] border border-zinc-100 dark:border-zinc-800">
                                  {['both', 'sales', 'support'].map((a) => (
                                    <button
                                      key={a}
                                      onClick={() => updateField(index, 'area', a)}
                                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest italic rounded-[16px] transition-all ${
                                        (field.area || 'both') === a 
                                          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-premium' 
                                          : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-zinc-400'
                                      }`}
                                    >
                                      {a === 'both' ? 'Unified' : a}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="lg:col-span-2 flex items-center justify-end">
                                <label className="flex items-center cursor-pointer group/toggle">
                                  <span className="mr-4 text-[10px] font-black uppercase tracking-widest italic text-zinc-500 group-hover/toggle:text-zinc-900 dark:group-hover/toggle:text-white transition-colors">Enforce Validation</span>
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={field.required || false}
                                      onChange={(e) => updateField(index, 'required', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-14 h-8 bg-zinc-100 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const { getServerSession } = await import('next-auth/next');
  const { getAuthOptions } = await import('@/lib/server/auth');
  const options = await getAuthOptions();
  const session = await getServerSession(context.req, context.res, options);
  let isTeamOwner = false;
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );
    if (workspace) {
      isTeamOwner = isWorkspaceOwner(session.user.email, workspace);
    }
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

  if (!isTeamOwner) {
    return {
      redirect: {
        destination: `/account/${workspace.slug}`,
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
