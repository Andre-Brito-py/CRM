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
} from '@heroicons/react/24/outline';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import WebFormBuilder from '@/components/WebFormBuilder/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const WebForms = () => {
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

  return (
    <AccountLayout>
      <Meta title={`Web Forms - ${workspace?.name || 'Workspace'}`} />
      <Content title="Web Forms (Form Builder)" subtitle="Build public forms to capture leads directly into your CRM pipelines.">
        <div className="flex justify-end mb-5">
          <button
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Web Form
          </button>
        </div>

        {error ? (
          <div className="text-red-500">Failed to load web forms.</div>
        ) : webForms.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow border border-gray-200">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Web Forms created yet.</h3>
            <p className="mt-1 text-sm text-gray-500">Create forms to automatically import leads to your CRM.</p>
            <div className="mt-6">
              <button
                onClick={toggleModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                New Form
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webForms.map((form) => (
              <Card key={form.id}>
                <Card.Body>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{form.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        URL: <span className="text-blue-600 font-mono">/f/{form.slug}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {form.stageId && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            Stage: {allStages.find(s => s.id === form.stageId)?.name || 'Unknown'}
                          </span>
                        )}
                        {form.tagId && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            Tag: {tags.find(t => t.id === form.tagId)?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openBuilder(form)}
                        className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                        title="Edit Form Fields"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(form.slug)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Copy Public Link"
                      >
                        <ClipboardDocumentIcon className="w-5 h-5" />
                      </button>
                      <a
                        href={`/f/${form.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded inline-block"
                        title="View Public Form"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete Form"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}

        <Modal show={isModalOpen} toggle={toggleModal} title="Create Web Form">
          <form onSubmit={handleCreateForm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Form Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="e.g. Contact Us"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Public Slug URL</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  /f/
                </span>
                <input
                  type="text"
                  required
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="contact-us"
                  value={newForm.slug}
                  onChange={(e) => setNewForm({ ...newForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">After Submission Actions</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Pipeline Stage</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    value={newForm.stageId}
                    onChange={(e) => setNewForm({ ...newForm, stageId: e.target.value })}
                  >
                    <option value="">- Don&apos;t attach to a Deal -</option>
                    {allStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Apply Tag</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
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

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Form Details</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submit Button Text</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    value={newForm.submitText}
                    onChange={(e) => setNewForm({ ...newForm, submitText: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Success Message</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    value={newForm.successMessage}
                    onChange={(e) => setNewForm({ ...newForm, successMessage: e.target.value })}
                  />
                </div>
              </div>
            </div>

             <div className="flex justify-end pt-4 space-x-2">
              <button
                type="button"
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                onClick={toggleModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Form'}
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
      </Content>
    </AccountLayout>
  );
};

export default WebForms;
