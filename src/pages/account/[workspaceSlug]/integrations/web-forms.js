import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import WebFormBuilder from '@/components/WebFormBuilder/index';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const WebForms = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useWorkspace();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    slug: '',
    submitText: 'Enviar Formulário',
    successMessage: 'Obrigado! Recebemos seus dados.',
    pipelineId: '',
    stageId: '',
    tagId: '',
    config: [],
  });

  const { data: webFormsData, error } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/web-forms` : null,
    api
  );

  const { data: pipelinesData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/pipelines` : null,
    api
  );

  const { data: tagsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/tags` : null,
    api
  );

  const webForms = webFormsData?.data?.webForms || [];
  const pipelines = pipelinesData?.data?.pipelines || [];
  const tags = tagsData?.data?.tags || [];

  const allStages = pipelines.flatMap(p => p.stages || []);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    if (!isModalOpen) {
      setNewForm({
        name: '',
        slug: '',
        submitText: 'Enviar Formulário',
        successMessage: 'Obrigado! Recebemos seus dados.',
        pipelineId: '',
        stageId: '',
        tagId: '',
        config: [],
      });
    }
  };

  const toggleBuilder = () => {
    setIsBuilderOpen(!isBuilderOpen);
    if (isBuilderOpen) setSelectedForm(null);
  };

  const openBuilder = (form) => {
    setSelectedForm(form);
    setIsBuilderOpen(true);
  };

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/web-forms`, {
        method: 'POST',
        body: newForm,
      });
      toast.success('Web Form created successfully!');
      mutate(`/api/workspace/${workspaceSlug}/web-forms`);
      toggleModal();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error creating form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteForm = async (id) => {
    if (!confirm('Are you sure you want to delete this Web Form?')) return;
    try {
      await api(`/api/workspace/${workspaceSlug}/web-forms/${id}`, {
        method: 'DELETE',
      });
      toast.success('Form deleted');
      mutate(`/api/workspace/${workspaceSlug}/web-forms`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete form');
    }
  };

  const copyToClipboard = (slug) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const webFormSteps = [
    {
      element: '#btn-create-web-form',
      popover: {
        title: 'Crie seu Formulário',
        description: 'Comece criando um formulário público para capturar leads diretamente no seu CRM.',
        position: 'bottom',
      },
    },
    {
      element: '#web-forms-list',
      popover: {
        title: 'Sua Lista de Formulários',
        description: 'Aqui você gerencia todos os seus formulários, copia links públicos e edita campos.',
        position: 'top',
      },
    },
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="web-forms-tour" steps={webFormSteps} />
      <Meta title={`Web Forms - ${workspace?.name || 'Workspace'}`} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">{t('webForms.hero.badge')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              {t('webForms.hero.title1')}<span className="text-indigo-600">{t('webForms.hero.title2')}</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed">
              {t('webForms.hero.subtitle')}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="btn-create-web-form"
            className="flex items-center px-8 py-4 text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/25 font-bold text-sm uppercase tracking-widest active:scale-95 transition-all"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-3 stroke-[3]" />
            {t('webForms.btn.create')}
          </motion.button>
        </motion.div>

        {error ? (
          <div className="vysify-glass p-12 text-center text-red-500 rounded-[2.5rem]">
            <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-executive font-bold text-lg uppercase italic tracking-tight">{t('webForms.error.load')}</p>
          </div>
        ) : webForms.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vysify-glass p-20 text-center rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800/50"
          >
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 rounded-[32px] shadow-premium flex items-center justify-center mx-auto border border-zinc-100 dark:border-zinc-800">
                <DocumentTextIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic tracking-tight mb-3">
              {t('webForms.empty.title1')}<span className="text-zinc-400 font-medium">{t('webForms.empty.title2')}</span>
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed italic">
              {t('webForms.empty.subtitle')}
            </p>
            <button
              onClick={toggleModal}
              className="inline-flex items-center px-8 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
            >
              <PlusIcon className="mr-3 h-5 w-5 stroke-[3]" aria-hidden="true" />
              {t('webForms.empty.btn')}
            </button>
          </motion.div>
        ) : (
          <motion.div 
            id="web-forms-list" 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {webForms.map((form, idx) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group vysify-glass p-8 rounded-[2.5rem] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-2 border border-zinc-100/50 dark:border-zinc-800/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-500/10">
                        <DocumentTextIcon className="w-7 h-7 text-indigo-600" />
                      </div>
                      <div className="flex bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-1 border border-zinc-100 dark:border-zinc-700/50">
                        <button
                          onClick={() => openBuilder(form)}
                          className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                          title="Edit Fields"
                        >
                          <PencilSquareIcon className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(form.slug)}
                          className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                          title="Copy Link"
                        >
                          <ClipboardDocumentIcon className="w-4.5 h-4.5" />
                        </button>
                        <a
                          href={`/f/${form.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                          title="Preview"
                        >
                          <EyeIcon className="w-4.5 h-4.5" />
                        </a>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none mb-3 group-hover:text-indigo-600 transition-colors italic uppercase">
                        {form.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-1.5 rounded-lg border border-zinc-100/50 dark:border-zinc-700/50 w-fit">
                        <span>URL:</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">/f/{form.slug}</span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-6 border-t border-zinc-50 dark:border-zinc-800/50">
                      {form.stageId && (
                        <span className="px-3 py-1.5 bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-yellow-200/50 dark:border-yellow-900/30">
                          {allStages.find(s => s.id === form.stageId)?.name || 'Stage'}
                        </span>
                      )}
                      {form.tagId && (
                        <span className="px-3 py-1.5 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-200/50 dark:border-emerald-900/30">
                          {tags.find(t => t.id === form.tagId)?.name || 'Tag'}
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="ml-auto p-2 text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

        <Modal show={isModalOpen} toggle={toggleModal} title="Create Web Form">
          <form onSubmit={handleCreateForm} className="space-y-8 p-4">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Form Name</label>
              <input
                type="text"
                required
                className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-executive"
                placeholder="e.g. Lead Generation"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Public URL Slug</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <span className="text-zinc-400 font-mono text-sm">/f/</span>
                </div>
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-mono"
                  placeholder="contact-us"
                  value={newForm.slug}
                  onChange={(e) => setNewForm({ ...newForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="text-[12px] font-black text-zinc-900 dark:text-white uppercase italic tracking-tight mb-6">Automation & Mapping</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Target Pipeline Stage</label>
                  <select
                    className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                    value={newForm.stageId}
                    onChange={(e) => setNewForm({ ...newForm, stageId: e.target.value })}
                  >
                    <option value="">- Don&apos;t attach -</option>
                    {allStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Apply Tag</label>
                  <select
                    className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                    value={newForm.tagId}
                    onChange={(e) => setNewForm({ ...newForm, tagId: e.target.value })}
                  >
                    <option value="">- No tag -</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="text-[12px] font-black text-zinc-900 dark:text-white uppercase italic tracking-tight mb-6">User Experience</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Submit Text</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-executive"
                    value={newForm.submitText}
                    onChange={(e) => setNewForm({ ...newForm, submitText: e.target.value })}
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] pl-1 ml-1">Success Message</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-executive"
                    value={newForm.successMessage}
                    onChange={(e) => setNewForm({ ...newForm, successMessage: e.target.value })}
                  />
                </div>
              </div>
            </div>

             <div className="flex justify-end pt-8 gap-4">
              <button
                type="button"
                className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                onClick={toggleModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-indigo-600 premium-gradient text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-glow-indigo/20 disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Processing...' : 'Create Form'}
              </button>
            </div>
          </form>
        </Modal>

        {isBuilderOpen && (
          <WebFormBuilder 
            show={isBuilderOpen}
            toggle={toggleBuilder}
            form={selectedForm}
          />
        )}
    </AccountLayout>
  );
};

export default WebForms;
