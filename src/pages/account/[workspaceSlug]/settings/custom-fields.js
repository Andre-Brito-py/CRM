import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  TrashIcon, 
  Bars2Icon, 
  CalendarIcon, 
  HashtagIcon, 
  ChevronDownIcon, 
  CheckIcon, 
  CurrencyDollarIcon, 
  LinkIcon, 
  PhoneIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';
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
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-executive font-bold text-zinc-900 tracking-tight mb-2">
              Custom Fields
            </h1>
            <p className="text-zinc-500 font-medium font-executive">
              Define custom properties to track unique data for your contacts and deals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="add-field-btn"
              onClick={addField}
              className="inline-flex items-center px-6 py-3 bg-white border border-zinc-200 text-zinc-900 font-executive font-bold rounded-2xl shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-95"
            >
              <PlusIcon className="w-5 h-5 mr-2 text-brand-600" />
              Add New Property
            </button>
            <button
              onClick={saveFields}
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3 bg-brand-600 text-white font-executive font-bold rounded-2xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('common.action.saving') : 'Save Configuration'}
            </button>
          </div>
        </div>

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
                  <div className="flex flex-col items-center justify-center p-20 bg-zinc-50/50 border-2 border-dashed border-zinc-200 rounded-[40px] text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-premium flex items-center justify-center mb-6">
                      <Bars2Icon className="w-10 h-10 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-executive font-bold text-zinc-900 mb-2">No custom fields yet</h3>
                    <p className="text-zinc-400 max-w-sm font-executive">Create your first custom property to start tailoring Vysify to your business needs.</p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <Draggable key={field.id || index} draggableId={String(field.id || index)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group bg-white p-2 rounded-[32px] border transition-all duration-300 ${
                            snapshot.isDragging 
                              ? 'shadow-2xl border-brand-500/30 ring-4 ring-brand-500/5 rotate-1 z-50' 
                              : 'shadow-premium border-zinc-100 hover:border-zinc-200'
                          }`}
                        >
                          <div className="flex items-start gap-4 p-4 lg:p-6">
                            <div 
                              {...provided.dragHandleProps}
                              className="mt-2 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 rounded-xl transition-colors cursor-grab active:cursor-grabbing"
                            >
                              <Bars2Icon className="w-6 h-6" />
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              <div className="lg:col-span-1">
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Label</label>
                                <input
                                  type="text"
                                  value={field.label || ''}
                                  onChange={(e) => updateField(index, 'label', e.target.value)}
                                  className="w-full h-12 px-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-[15px] font-executive font-bold focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                                  placeholder="e.g. Birthday"
                                />
                              </div>
                              <div className="lg:col-span-1">
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Internal Key</label>
                                <input
                                  type="text"
                                  value={field.key || ''}
                                  onChange={(e) => updateField(index, 'key', e.target.value)}
                                  className="w-full h-12 px-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-[14px] font-medium text-zinc-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                                  placeholder="e.g. birthday"
                                />
                              </div>
                              <div className="lg:col-span-1">
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Field Type</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600">
                                    <FieldTypeIcon type={field.type} />
                                  </div>
                                  <select
                                    value={field.type || 'text'}
                                    onChange={(e) => updateField(index, 'type', e.target.value)}
                                    className="w-full h-12 pl-12 pr-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-[14px] font-executive font-bold appearance-none focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all cursor-pointer"
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
                              </div>
                              <div className="lg:col-span-1 flex items-center justify-end">
                                <button
                                  onClick={() => removeField(index)}
                                  className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                  title="Delete field"
                                >
                                  <TrashIcon className="w-6 h-6" />
                                </button>
                              </div>

                              {(field.type === 'select' || field.type === 'multi-select') && (
                                <div className="lg:col-span-4">
                                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Options (Comma separated)</label>
                                  <input
                                    type="text"
                                    value={field.options || ''}
                                    onChange={(e) => updateField(index, 'options', e.target.value)}
                                    className="w-full h-12 px-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-[14px] font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-zinc-300"
                                    placeholder="Option 1, Option 2, Option 3"
                                  />
                                </div>
                              )}

                              <div className="lg:col-span-2">
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 ml-1">Visibility Range</label>
                                <div className="flex bg-zinc-50/50 p-1 rounded-[18px] border border-zinc-100">
                                  {['both', 'sales', 'support'].map((a) => (
                                    <button
                                      key={a}
                                      onClick={() => updateField(index, 'area', a)}
                                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-[14px] transition-all ${
                                        (field.area || 'both') === a 
                                          ? 'bg-white text-zinc-900 shadow-premium' 
                                          : 'text-zinc-400 hover:text-zinc-600 font-executive'
                                      }`}
                                    >
                                      {a === 'both' ? 'All Areas' : a}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="lg:col-span-2 flex items-center gap-4">
                                <div className="flex-1 flex items-center">
                                  <label className="relative flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.required || false}
                                      onChange={(e) => updateField(index, 'required', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                    <span className="ml-4 text-[13px] font-executive font-bold text-zinc-700">Mandatory Field</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
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
