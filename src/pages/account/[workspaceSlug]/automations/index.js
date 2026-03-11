import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from 'react-i18next';

const Automations = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useWorkspace();

  // State for modal and form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    triggerType: 'DEAL_STAGE_CHANGED',
    triggerConfig: { stageId: '', keywords: '' },
    actionType: 'SEND_WHATSAPP',
    actionConfig: { templateId: '', userId: '' }
  });

  // Fetch Data
  const { data: automationsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/automations` : null
  );

  const { data: pipelinesData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/pipelines` : null
  );

  const { data: templatesData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null
  );

  const { data: membersData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/members` : null
  );

  const automations = automationsData?.data?.automations || [];
  const pipelines = pipelinesData?.data?.pipelines || [];
  const templates = templatesData?.data?.templates || [];
  const members = membersData?.data?.members || [];

  // Helper to get all stages from all pipelines
  const allStages = pipelines.flatMap(p => p.stages || []);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    // Reset form when opening
    if (!isModalOpen) {
      setNewRule({
        name: '',
        triggerType: 'DEAL_STAGE_CHANGED',
        triggerConfig: { stageId: '', keywords: '' },
        actionType: 'SEND_WHATSAPP',
        actionConfig: { templateId: '', userId: '' }
      });
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();

    // Validation
    if (!newRule.name) {
      toast.error(t('automations.validation.nameRequired'));
      return;
    }

    if (newRule.triggerType === 'DEAL_STAGE_CHANGED' && !newRule.triggerConfig.stageId) {
      toast.error(t('automations.validation.stageRequired'));
      return;
    }

    if (newRule.actionType === 'SEND_WHATSAPP' && !newRule.actionConfig.templateId) {
      toast.error(t('automations.validation.templateRequired'));
      return;
    }

    if (newRule.actionType === 'ASSIGN_TO_USER' && !newRule.actionConfig.userId) {
      toast.error(t('automations.validation.userRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/automations`, {
        method: 'POST',
        body: newRule,
      });
      toast.success(t('automations.created'));
      mutate(`/api/workspace/${workspaceSlug}/automations`);
      toggleModal();
    } catch (error) {
      console.error(error);
      toast.error(t('automations.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm(t('automations.delete.confirm'))) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/automations`, {
        method: 'DELETE',
        body: { id }
      });
      toast.success(t('automations.deleted'));
      mutate(`/api/workspace/${workspaceSlug}/automations`);
    } catch (error) {
      console.error(error);
      toast.error(t('automations.deleteFailed'));
    }
  };

  const renderTriggerDescription = (rule) => {
    if (rule.triggerType === 'DEAL_STAGE_CHANGED') {
      const stageName = allStages.find(s => s.id === rule.triggerConfig?.stageId)?.name || t('automations.unknownStage');
      return (
        <span>
          {t('automations.trigger.stageChangedTo')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{stageName}</span>
        </span>
      );
    } else if (rule.triggerType === 'INCOMING_MESSAGE') {
      const keywords = rule.triggerConfig?.keywords;
      return (
        <span>
          {t('automations.trigger.incomingMessage')}{' '}
          {keywords ? (
            <span>
              {t('automations.trigger.contains')}{' '}
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{keywords}</span>
            </span>
          ) : (
            t('automations.trigger.received')
          )}
        </span>
      );
    }
    return <span>{rule.triggerType}</span>;
  };

  const renderActionDescription = (rule) => {
    if (rule.actionType === 'SEND_WHATSAPP') {
      const templateName = templates.find(t => t.id === rule.actionConfig?.templateId)?.name || t('automations.unknownTemplate');
      return (
        <span>
          {t('automations.action.sendWhatsAppTemplate')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">{templateName}</span>
        </span>
      );
    } else if (rule.actionType === 'ASSIGN_TO_USER') {
      const member = members.find(m => m.member?.id === rule.actionConfig?.userId);
      const memberName = member?.member?.name || t('automations.unknownUser');
      return (
        <span>
          {t('automations.action.assignToUser')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{memberName}</span>
        </span>
      );
    }
    return <span>{rule.actionType}</span>;
  };

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | ${t('Automations')}`} />
      <Content.Title
        title={t('Automations')}
        subtitle={t('automations.subtitle')}
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-end mb-5">
          <button
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('automations.createRule')}
          </button>
        </div>

        {automations.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <BoltIcon className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('automations.empty.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('automations.empty.subtitle')}</p>
            <div className="mt-6">
              <button
                onClick={toggleModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                {t('automations.newRule')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {automations.map((rule) => (
              <Card key={rule.id}>
                <Card.Body>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-semibold mr-2 w-16">{t('automations.trigger.label')}</span>
                          {renderTriggerDescription(rule)}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-semibold mr-2 w-16">{t('automations.action.label')}</span>
                          {renderActionDescription(rule)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rule.isActive ? t('common.status.active') : t('common.status.inactive')}
                      </span>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title={t('automations.deleteRule')}
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

        <Modal
          show={isModalOpen}
          toggle={toggleModal}
          title={t('automations.modal.title')}
        >
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('automations.form.ruleName')}</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder={t('automations.form.ruleNamePlaceholder')}
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t('automations.trigger.title')}</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.when')}</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                    value={newRule.triggerType}
                    onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                  >
                    <option value="DEAL_STAGE_CHANGED">{t('automations.trigger.option.dealStageChanged')}</option>
                    <option value="INCOMING_MESSAGE">{t('automations.trigger.option.incomingMessage')}</option>
                  </select>
                </div>

                {newRule.triggerType === 'DEAL_STAGE_CHANGED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.targetStage')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.triggerConfig.stageId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        triggerConfig: { ...newRule.triggerConfig, stageId: e.target.value }
                      })}
                    >
                      <option value="">{t('automations.trigger.selectStage')}</option>
                      {allStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newRule.triggerType === 'INCOMING_MESSAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.keywords')}</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder={t('automations.trigger.keywordsPlaceholder')}
                      value={newRule.triggerConfig.keywords || ''}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        triggerConfig: { ...newRule.triggerConfig, keywords: e.target.value }
                      })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t('automations.action.title')}</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('automations.action.doThis')}</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                    value={newRule.actionType}
                    onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  >
                    <option value="SEND_WHATSAPP">{t('automations.action.option.sendWhatsApp')}</option>
                    <option value="ASSIGN_TO_USER">{t('automations.action.option.assignToUser')}</option>
                  </select>
                </div>

                {newRule.actionType === 'SEND_WHATSAPP' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.template')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.templateId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, templateId: e.target.value }
                      })}
                    >
                      <option value="">{t('automations.action.selectTemplate')}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newRule.actionType === 'ASSIGN_TO_USER' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.assignTo')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.userId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, userId: e.target.value }
                      })}
                    >
                      <option value="">{t('automations.action.selectUser')}</option>
                      {members.map((m) => (
                        <option key={m.member?.id} value={m.member?.id}>
                          {m.member?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm"
                onClick={toggleModal}
              >
                {t('common.action.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? t('automations.creating') : t('automations.createRule')}
              </button>
            </div>
          </form>
        </Modal>
      </Content.Container>
    </AccountLayout>
  );
};

export default Automations;
