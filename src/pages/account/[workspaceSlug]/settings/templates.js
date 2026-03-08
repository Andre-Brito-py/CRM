import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import AccountLayout from '@/layouts/AccountLayout';
import Modal from '@/components/Modal'; 
import api from '@/lib/common/api';

const Templates = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, mutate } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null, api);
  const templates = data?.data?.templates || [];

  const handleSave = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const content = e.target.content.value;
    
    setIsSubmitting(true);
    try {
      if (currentTemplate) {
        await api(`/api/workspace/${workspaceSlug}/inbox/templates/${currentTemplate.id}`, {
          method: 'PUT',
          body: { name, content },
        });
        toast.success('Template updated');
      } else {
        await api(`/api/workspace/${workspaceSlug}/inbox/templates`, {
          method: 'POST',
          body: { name, content },
        });
        toast.success('Template created');
      }
      mutate();
      setModalOpen(false);
      setCurrentTemplate(null);
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/templates/${id}`, {
        method: 'DELETE',
      });
      toast.success('Template deleted');
      mutate();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const openModal = (template = null) => {
    setCurrentTemplate(template);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentTemplate(null);
  };

  return (
    <AccountLayout>
      <Meta title="Nextacular - Templates" />
      <Content.Title
        title="Message Templates"
        subtitle="Manage reusable message templates for WhatsApp"
      />
      <Content.Divider />
      <Content.Container>
        <div className="mb-6 flex justify-end">
            <button
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Template
            </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {templates.length === 0 && (
                    <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                        No templates found. Create one to get started.
                    </li>
                )}
                {templates.map((template) => (
                    <li key={template.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                                <p className="mt-1 text-sm text-gray-500 truncate">{template.content}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => openModal(template)}
                                    className="p-2 text-gray-400 hover:text-gray-500"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="p-2 text-red-400 hover:text-red-500"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>

        <Modal show={isModalOpen} toggle={closeModal} title={currentTemplate ? 'Edit Template' : 'New Template'}>
            <form onSubmit={handleSave} className="space-y-4 w-full">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        name="name"
                        defaultValue={currentTemplate?.name}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g. Welcome Message"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea
                        name="content"
                        defaultValue={currentTemplate?.content}
                        required
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="Hello, how can we help you?"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Templates can be used in conversations and automations.
                    </p>
                </div>
                <div className="flex justify-end space-x-3 mt-5">
                    <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
      </Content.Container>
    </AccountLayout>
  );
};

export default Templates;
