import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import AccountLayout from '@/layouts/AccountLayout';
import Modal from '@/components/Modal';
import api from '@/lib/common/api';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const SUPPORTED_LANGUAGES = ['und', 'pt', 'en', 'es', 'fr', 'de', 'it'];

const parseTemplateName = (rawName) => {
  const name = `${rawName || ''}`;
  const langMatch = name.match(/^([a-z]{2})::(.*)$/i);
  const lang = langMatch ? langMatch[1].toLowerCase() : 'und';
  const rest = langMatch ? langMatch[2] : name;

  const parts = rest.split('/').filter(Boolean);
  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  const displayName = parts.length > 0 ? parts[parts.length - 1] : rest;

  const versionMatch = displayName.match(/^(.*)\s+\(v(\d+)\)\s*$/i);
  const baseName = versionMatch ? versionMatch[1] : displayName;
  const version = versionMatch ? Number(versionMatch[2]) : null;

  return {
    lang: SUPPORTED_LANGUAGES.includes(lang) ? lang : 'und',
    folder,
    displayName,
    baseName,
    version,
  };
};

const composeTemplateName = ({ lang, folder, name }) => {
  const safeLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'und';
  const safeFolder = `${folder || ''}`.trim().replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '');
  const safeName = `${name || ''}`.trim();
  const path = safeFolder ? `${safeFolder}/${safeName}` : safeName;
  return safeLang === 'und' ? path : `${safeLang}::${path}`;
};

const getNextVersionedName = (existing, { lang, folder, baseName }) => {
  const normalizedBase = `${baseName || ''}`.trim();
  if (!normalizedBase) return normalizedBase;

  const versions = existing
    .map((t) => ({ ...t, parsed: parseTemplateName(t.name) }))
    .filter((t) => t.parsed.lang === lang && t.parsed.folder === folder)
    .map((t) => t.parsed.displayName)
    .map((displayName) => {
      const match = displayName.match(new RegExp(`^${normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\(v(\\d+)\\)\\s*$`, 'i'));
      return match ? Number(match[1]) : null;
    })
    .filter((v) => typeof v === 'number' && Number.isFinite(v));

  const nextVersion = (versions.length > 0 ? Math.max(...versions) : 1) + 1;
  return `${normalizedBase} (v${nextVersion})`;
};

const Templates = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [activeLanguage, setActiveLanguage] = useState('all');
  const [formValues, setFormValues] = useState({ name: '', folder: '', language: 'und', content: '' });
  const { t } = useTranslation();

  const templateSteps = [
    {
      element: '#search-filters-bar',
      popover: {
        title: t('onboarding.tour.templates.step1.title'),
        description: t('onboarding.tour.templates.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#add-template-btn',
      popover: {
        title: t('onboarding.tour.templates.step2.title'),
        description: t('onboarding.tour.templates.step2.desc'),
        position: 'left',
      }
    },
    {
      element: '#templates-list-container',
      popover: {
        title: t('onboarding.tour.templates.step3.title'),
        description: t('onboarding.tour.templates.step3.desc'),
        position: 'top',
      }
    }
  ];

  const { data, mutate } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null, api);
  const templates = data?.data?.templates;

  const handleSave = async (e) => {
    e.preventDefault();
    const content = formValues.content;
    const composedName = composeTemplateName({
      lang: formValues.language,
      folder: formValues.folder,
      name: formValues.name,
    });

    setIsSubmitting(true);
    try {
      if (currentTemplate) {
        await api(`/api/workspace/${workspaceSlug}/inbox/templates/${currentTemplate.id}`, {
          method: 'PUT',
          body: { name: composedName, content },
        });
        toast.success('Template updated');
      } else {
        await api(`/api/workspace/${workspaceSlug}/inbox/templates`, {
          method: 'POST',
          body: { name: composedName, content },
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

  const handleDuplicate = async (template) => {
    const parsed = parseTemplateName(template?.name);
    const versionedName = getNextVersionedName(Array.isArray(templates) ? templates : [], {
      lang: parsed.lang,
      folder: parsed.folder,
      baseName: parsed.baseName,
    });

    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/templates`, {
        method: 'POST',
        body: {
          name: composeTemplateName({
            lang: parsed.lang,
            folder: parsed.folder,
            name: versionedName,
          }),
          content: template?.content || '',
        },
      });
      toast.success('Template duplicated');
      mutate();
    } catch (error) {
      toast.error('Failed to duplicate template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (template = null) => {
    setCurrentTemplate(template);
    const parsed = parseTemplateName(template?.name);
    setFormValues({
      name: template ? parsed.displayName : '',
      folder: template ? parsed.folder : '',
      language: template ? parsed.lang : 'und',
      content: template?.content || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentTemplate(null);
    setFormValues({ name: '', folder: '', language: 'und', content: '' });
  };

  const templateRows = useMemo(() => {
    return (Array.isArray(templates) ? templates : []).map((t) => ({ ...t, parsed: parseTemplateName(t.name) }));
  }, [templates]);

  const folders = useMemo(() => {
    const unique = new Set();
    templateRows.forEach((t) => {
      const folder = `${t.parsed.folder || ''}`.trim();
      if (folder) unique.add(folder);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [templateRows]);

  const languages = useMemo(() => {
    const unique = new Set(['und']);
    templateRows.forEach((t) => {
      unique.add(t.parsed.lang || 'und');
    });
    const ordered = SUPPORTED_LANGUAGES.filter((l) => unique.has(l));
    const rest = Array.from(unique).filter((l) => !ordered.includes(l)).sort();
    return [...ordered, ...rest];
  }, [templateRows]);

  const filteredTemplates = useMemo(() => {
    const q = `${searchQuery || ''}`.trim().toLowerCase();
    return templateRows.filter((t) => {
      if (activeFolder !== 'all' && t.parsed.folder !== activeFolder) return false;
      if (activeLanguage !== 'all' && t.parsed.lang !== activeLanguage) return false;
      if (!q) return true;
      const haystack = `${t.parsed.displayName} ${t.content || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [templateRows, searchQuery, activeFolder, activeLanguage]);

  const groupedTemplates = useMemo(() => {
    const byFolder = new Map();
    filteredTemplates.forEach((t) => {
      const key = t.parsed.folder || '';
      if (!byFolder.has(key)) byFolder.set(key, []);
      byFolder.get(key).push(t);
    });
    const keys = Array.from(byFolder.keys()).sort((a, b) => {
      if (!a && b) return -1;
      if (a && !b) return 1;
      return a.localeCompare(b);
    });
    return keys.map((folder) => ({
      folder,
      items: byFolder.get(folder).sort((a, b) => a.parsed.displayName.localeCompare(b.parsed.displayName)),
    }));
  }, [filteredTemplates]);

  return (
    <AccountLayout>
      <OnboardingTour tourId="message-templates-tour" steps={templateSteps} />
      <Meta title="Closify - Templates" />
      <Content.Title
        title="Message Templates"
        subtitle="Manage reusable message templates for WhatsApp"
      />
      <Content.Divider />
      <Content.Container>
        <div id="search-filters-bar" className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="Search templates..."
            />
            <select
              value={activeFolder}
              onChange={(e) => setActiveFolder(e.target.value)}
              className="w-full md:w-56 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white"
            >
              <option value="all">All folders</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
            <select
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value)}
              className="w-full md:w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white"
            >
              <option value="all">All languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <button
            id="add-template-btn"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Template
          </button>
        </div>

        <div id="templates-list-container">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredTemplates.length === 0 && (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No templates found. Create one to get started.
                </li>
              )}
              {groupedTemplates.map((group) => (
                <li key={group.folder || '__root__'} className="bg-gray-50">
                  <div className="px-4 py-3 sm:px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {group.folder ? group.folder : 'No folder'}
                  </div>
                  <ul className="divide-y divide-gray-200 bg-white">
                    {group.items.map((template) => (
                      <li key={template.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="text-lg font-medium text-gray-900 truncate">{template.parsed.displayName}</h3>
                              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {template.parsed.lang.toUpperCase()}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 truncate">{template.content}</p>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleDuplicate(template)}
                              disabled={isSubmitting}
                              className="p-2 text-gray-400 hover:text-gray-500 disabled:opacity-50"
                              title="Duplicate"
                              type="button"
                            >
                              <DocumentDuplicateIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openModal(template)}
                              className="p-2 text-gray-400 hover:text-gray-500"
                              title="Edit"
                              type="button"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-2 text-red-400 hover:text-red-500"
                              title="Delete"
                              type="button"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Modal show={isModalOpen} toggle={closeModal} title={currentTemplate ? 'Edit Template' : 'New Template'}>
          <form onSubmit={handleSave} className="space-y-4 w-full" key={currentTemplate?.id || 'new'}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={formValues.language}
                  onChange={(e) => setFormValues((v) => ({ ...v, language: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Folder</label>
                <input
                  value={formValues.folder}
                  onChange={(e) => setFormValues((v) => ({ ...v, folder: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g. Sales/Follow-ups"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                value={formValues.name}
                onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="e.g. Welcome Message"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                value={formValues.content}
                onChange={(e) => setFormValues((v) => ({ ...v, content: e.target.value }))}
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
