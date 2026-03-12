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
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateResult, setSimulateResult] = useState(null);
  const [simulateInputs, setSimulateInputs] = useState({
    contactId: '',
    dealId: '',
    message: '',
  });
  const [newRule, setNewRule] = useState({
    name: '',
    triggerType: 'DEAL_STAGE_CHANGED',
    triggerConfig: { stageId: '', keywords: '', tagId: '', platform: '', operator: 'AND', hours: { start: null, end: null } },
    actionType: 'SEND_WHATSAPP',
    actionConfig: { templateId: '', userId: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' }
  });

  // Fetch Data
  const { data: automationsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/automations` : null
  );

  const { data: logsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/automations/logs` : null
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

  const { data: tagsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/tags` : null
  );

  const automations = automationsData?.data?.rules || automationsData?.data?.automations || [];
  const pipelines = pipelinesData?.data?.pipelines || [];
  const templates = templatesData?.data?.templates || [];
  const members = membersData?.data?.members || [];
  const tags = tagsData?.data?.tags || [];
  const logs = logsData?.data?.logs || [];

  // Helper to get all stages from all pipelines
  const allStages = pipelines.flatMap(p => p.stages || []);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    // Reset form when opening
    if (!isModalOpen) {
      setSimulateResult(null);
      setSimulateInputs({ contactId: '', dealId: '', message: '' });
      setNewRule({
        name: '',
        triggerType: 'DEAL_STAGE_CHANGED',
        triggerConfig: { stageId: '', keywords: '', tagId: '', platform: '', operator: 'AND', hours: { start: null, end: null } },
        actionType: 'SEND_WHATSAPP',
        actionConfig: { templateId: '', userId: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' }
      });
    }
  };

  const handleSimulateRule = async () => {
    setIsSimulating(true);
    try {
      const baseEventData = {
        contactId: simulateInputs.contactId || null,
        dealId: simulateInputs.dealId || null,
      };

      const eventData =
        newRule.triggerType === 'INCOMING_MESSAGE'
          ? {
            ...baseEventData,
            message: { content: simulateInputs.message || '' },
            conversation: { platform: newRule.triggerConfig.platform || 'WHATSAPP' },
          }
          : newRule.triggerType === 'PAYMENT_CREATED' || newRule.triggerType === 'PAYMENT_PAID' || newRule.triggerType === 'PAYMENT_FAILED'
            ? {
              ...baseEventData,
              payment: {
                id: 'simulated',
                status: newRule.triggerType === 'PAYMENT_PAID' ? 'PAID' : newRule.triggerType === 'PAYMENT_FAILED' ? 'FAILED' : 'PENDING',
                invoiceUrl: 'https://example.com/invoice',
                value: 100,
              },
            }
            : newRule.triggerType === 'NPS_RESPONSE_RECEIVED' || newRule.triggerType === 'NPS_PROMOTER' || newRule.triggerType === 'NPS_DETRACTOR'
              ? {
                ...baseEventData,
                npsResponse: {
                  id: 'simulated',
                  score: newRule.triggerType === 'NPS_DETRACTOR' ? 2 : 10,
                  classification: newRule.triggerType === 'NPS_DETRACTOR' ? 'detractor' : 'promoter',
                },
              }
              : {
                ...baseEventData,
                stageId: newRule.triggerConfig.stageId || null,
              };

      const rule = {
        triggerType: newRule.triggerType,
        triggerConfig: newRule.triggerConfig,
        actionType: newRule.actionType,
        actionConfig: newRule.actionConfig,
      };

      const response = await api(`/api/workspace/${workspaceSlug}/automations/simulate`, {
        method: 'POST',
        body: { rule, eventData },
      });

      setSimulateResult(response?.data?.result || null);
    } catch (error) {
      console.error(error);
      toast.error(t('automations.simulate.failed'));
    } finally {
      setIsSimulating(false);
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

    const hoursStart = newRule.triggerConfig?.hours?.start;
    const hoursEnd = newRule.triggerConfig?.hours?.end;
    const isHourValid = (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 23);
    if (!isHourValid(hoursStart) || !isHourValid(hoursEnd)) {
      toast.error(t('automations.validation.hoursInvalid'));
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

    if (newRule.actionType === 'CREATE_TASK' && !newRule.actionConfig.title) {
      toast.error(t('automations.validation.taskTitleRequired'));
      return;
    }

    if (newRule.actionType === 'MOVE_DEAL_STAGE' && !newRule.actionConfig.stageId) {
      toast.error(t('automations.validation.moveStageRequired'));
      return;
    }

    if (newRule.actionType === 'APPLY_TAG' && !newRule.actionConfig.tagId) {
      toast.error(t('automations.validation.tagRequired'));
      return;
    }

    if (newRule.actionType === 'MULTI_ACTIONS') {
      const actions = Array.isArray(newRule.actionConfig?.actions) ? newRule.actionConfig.actions : [];
      if (actions.length === 0) {
        toast.error(t('automations.validation.multiActionsRequired'));
        return;
      }

      for (const action of actions) {
        const type = action?.type;
        const cfg = action?.config || {};

        if (!type) {
          toast.error(t('automations.validation.multiActionsRequired'));
          return;
        }

        if (type === 'SEND_WHATSAPP' && !cfg.templateId) {
          toast.error(t('automations.validation.templateRequired'));
          return;
        }

        if (type === 'ASSIGN_TO_USER' && !cfg.userId) {
          toast.error(t('automations.validation.userRequired'));
          return;
        }

        if (type === 'CREATE_TASK' && !cfg.title) {
          toast.error(t('automations.validation.taskTitleRequired'));
          return;
        }

        if (type === 'MOVE_DEAL_STAGE' && !cfg.stageId) {
          toast.error(t('automations.validation.moveStageRequired'));
          return;
        }

        if (type === 'APPLY_TAG' && !cfg.tagId) {
          toast.error(t('automations.validation.tagRequired'));
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const triggerConfig = {
        ...(newRule.triggerConfig || {}),
        hours:
          newRule.triggerConfig?.hours?.start === null || newRule.triggerConfig?.hours?.end === null
            ? null
            : { start: newRule.triggerConfig.hours.start, end: newRule.triggerConfig.hours.end },
      };

      await api(`/api/workspace/${workspaceSlug}/automations`, {
        method: 'POST',
        body: {
          ...newRule,
          triggerConfig,
        },
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
    const operator = `${rule.triggerConfig?.operator || 'AND'}`.toUpperCase() === 'OR' ? 'OR' : 'AND';
    const hours = rule.triggerConfig?.hours || null;
    const hasHours = Boolean(hours && (typeof hours.start === 'number' || typeof hours.end === 'number'));
    if (rule.triggerType === 'DEAL_STAGE_CHANGED') {
      const stageName = allStages.find(s => s.id === rule.triggerConfig?.stageId)?.name || t('automations.unknownStage');
      return (
        <span>
          {t('automations.trigger.stageChangedTo')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{stageName}</span>
          {operator === 'OR' ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.operatorChip')}: {operator}
            </span>
          ) : null}
          {rule.triggerConfig?.tagId ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.tagChip')}: {tags.find(tg => tg.id === rule.triggerConfig.tagId)?.name || t('automations.unknownTag')}
            </span>
          ) : null}
          {hasHours ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.hoursChip')}: {hours.start}-{hours.end}
            </span>
          ) : null}
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
          {operator === 'OR' ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.operatorChip')}: {operator}
            </span>
          ) : null}
          {rule.triggerConfig?.platform ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.channelChip')}: {rule.triggerConfig.platform}
            </span>
          ) : null}
          {rule.triggerConfig?.tagId ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.tagChip')}: {tags.find(tg => tg.id === rule.triggerConfig.tagId)?.name || t('automations.unknownTag')}
            </span>
          ) : null}
          {hasHours ? (
            <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">
              {t('automations.trigger.filter.hoursChip')}: {hours.start}-{hours.end}
            </span>
          ) : null}
        </span>
      );
    } else if (rule.triggerType === 'SLA_BREACH') {
      const minutes = rule.triggerConfig?.minutes || 15;
      return (
        <span>
          SLA Breach <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">{minutes} minutes</span>
        </span>
      );
    } else if (rule.triggerType === 'PAYMENT_CREATED') {
      return <span>{t('automations.trigger.paymentCreated')}</span>;
    } else if (rule.triggerType === 'PAYMENT_PAID') {
      return <span>{t('automations.trigger.paymentPaid')}</span>;
    } else if (rule.triggerType === 'PAYMENT_FAILED') {
      return <span>{t('automations.trigger.paymentFailed')}</span>;
    } else if (rule.triggerType === 'NPS_RESPONSE_RECEIVED') {
      return <span>{t('automations.trigger.npsResponseReceived')}</span>;
    } else if (rule.triggerType === 'NPS_PROMOTER') {
      return <span>{t('automations.trigger.npsPromoter')}</span>;
    } else if (rule.triggerType === 'NPS_DETRACTOR') {
      return <span>{t('automations.trigger.npsDetractor')}</span>;
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
    } else if (rule.actionType === 'CREATE_TASK') {
      const title = rule.actionConfig?.title || t('automations.unknownTaskTitle');
      return (
        <span>
          {t('automations.action.createTask')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">{title}</span>
        </span>
      );
    } else if (rule.actionType === 'CALL_WEBHOOK') {
      return <span>{t('automations.action.callWebhook')}</span>;
    } else if (rule.actionType === 'MOVE_DEAL_STAGE') {
      const stageName = allStages.find(s => s.id === rule.actionConfig?.stageId)?.name || t('automations.unknownStage');
      return (
        <span>
          {t('automations.action.moveDealStage')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{stageName}</span>
        </span>
      );
    } else if (rule.actionType === 'APPLY_TAG') {
      const tagName = tags.find(tg => tg.id === rule.actionConfig?.tagId)?.name || t('automations.unknownTag');
      return (
        <span>
          {t('automations.action.applyTag')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{tagName}</span>
        </span>
      );
    } else if (rule.actionType === 'MULTI_ACTIONS') {
      const count = Array.isArray(rule.actionConfig?.actions) ? rule.actionConfig.actions.length : 0;
      return (
        <span>
          {t('automations.action.multiActions')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">{count}</span>
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

        <div className="mt-6">
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{t('automations.logs.title')}</h3>
                <span className="text-xs text-gray-500">{t('automations.logs.subtitle')}</span>
              </div>

              {logs.length === 0 ? (
                <div className="mt-4 text-sm text-gray-500">{t('automations.logs.empty')}</div>
              ) : (
                <div className="mt-4 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('automations.logs.table.time')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('automations.logs.table.event')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('automations.logs.table.related')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.slice(0, 20).map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.type === 'AUTOMATION_FAILED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {log.type === 'AUTOMATION_FAILED' ? t('automations.logs.status.failed') : t('automations.logs.status.executed')}
                            </span>
                            <span className="ml-2">{log.title}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {log.contact?.name ? (
                              <span className="mr-2">{t('automations.logs.related.contact')}: {log.contact.name}</span>
                            ) : null}
                            {log.deal?.name ? (
                              <span>{t('automations.logs.related.deal')}: {log.deal.name}</span>
                            ) : null}
                            {!log.contact?.name && !log.deal?.name ? (
                              <span className="text-gray-400">—</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

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
                    onChange={(e) => setNewRule({
                      ...newRule,
                      triggerType: e.target.value,
                      triggerConfig: { stageId: '', keywords: '', tagId: '', platform: '', hours: { start: null, end: null } }
                    })}
                  >
                    <option value="DEAL_STAGE_CHANGED">{t('automations.trigger.option.dealStageChanged')}</option>
                    <option value="INCOMING_MESSAGE">{t('automations.trigger.option.incomingMessage')}</option>
                    <option value="PAYMENT_CREATED">{t('automations.trigger.option.paymentCreated')}</option>
                    <option value="PAYMENT_PAID">{t('automations.trigger.option.paymentPaid')}</option>
                    <option value="PAYMENT_FAILED">{t('automations.trigger.option.paymentFailed')}</option>
                    <option value="NPS_RESPONSE_RECEIVED">{t('automations.trigger.option.npsResponseReceived')}</option>
                    <option value="NPS_PROMOTER">{t('automations.trigger.option.npsPromoter')}</option>
                    <option value="NPS_DETRACTOR">{t('automations.trigger.option.npsDetractor')}</option>
                    <option value="SLA_BREACH">SLA Breach</option>
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

                {newRule.triggerType === 'SLA_BREACH' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Minutes without response</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="e.g. 15"
                      value={newRule.triggerConfig.minutes || 15}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        triggerConfig: { ...newRule.triggerConfig, minutes: Number(e.target.value) }
                      })}
                    />
                  </div>
                )}

                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">{t('automations.trigger.filtersTitle')}</h5>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.operator')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        value={newRule.triggerConfig.operator || 'AND'}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          triggerConfig: { ...newRule.triggerConfig, operator: e.target.value }
                        })}
                      >
                        <option value="AND">{t('automations.trigger.filter.operator.and')}</option>
                        <option value="OR">{t('automations.trigger.filter.operator.or')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.tag')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        value={newRule.triggerConfig.tagId || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          triggerConfig: { ...newRule.triggerConfig, tagId: e.target.value }
                        })}
                      >
                        <option value="">{t('automations.trigger.filter.anyTag')}</option>
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.channel')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        value={newRule.triggerConfig.platform || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          triggerConfig: { ...newRule.triggerConfig, platform: e.target.value }
                        })}
                      >
                        <option value="">{t('automations.trigger.filter.anyChannel')}</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.startHour')}</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        value={newRule.triggerConfig?.hours?.start ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setNewRule({
                            ...newRule,
                            triggerConfig: { ...newRule.triggerConfig, hours: { ...(newRule.triggerConfig?.hours || {}), start: v } }
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.endHour')}</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        value={newRule.triggerConfig?.hours?.end ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setNewRule({
                            ...newRule,
                            triggerConfig: { ...newRule.triggerConfig, hours: { ...(newRule.triggerConfig?.hours || {}), end: v } }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
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
                    onChange={(e) => {
                      const next = e.target.value;
                      const base = { templateId: '', userId: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' };
                      if (next === 'SEND_WHATSAPP') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'ASSIGN_TO_USER') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'CREATE_TASK') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'CALL_WEBHOOK') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'MOVE_DEAL_STAGE') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'APPLY_TAG') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                      else if (next === 'MULTI_ACTIONS') setNewRule({
                        ...newRule,
                        actionType: next,
                        actionConfig: {
                          actions: [
                            { type: 'SEND_WHATSAPP', delayMinutes: 0, config: { templateId: '' } }
                          ]
                        }
                      });
                      else setNewRule({ ...newRule, actionType: next, actionConfig: base });
                    }}
                  >
                    <option value="SEND_WHATSAPP">{t('automations.action.option.sendWhatsApp')}</option>
                    <option value="ASSIGN_TO_USER">{t('automations.action.option.assignToUser')}</option>
                    <option value="CREATE_TASK">{t('automations.action.option.createTask')}</option>
                    <option value="CALL_WEBHOOK">{t('automations.action.option.callWebhook')}</option>
                    <option value="MOVE_DEAL_STAGE">{t('automations.action.option.moveDealStage')}</option>
                    <option value="APPLY_TAG">{t('automations.action.option.applyTag')}</option>
                    <option value="MULTI_ACTIONS">{t('automations.action.option.multiActions')}</option>
                  </select>
                </div>

                {newRule.actionType === 'MULTI_ACTIONS' && (
                  <div className="space-y-3">
                    {(Array.isArray(newRule.actionConfig?.actions) ? newRule.actionConfig.actions : []).map((action, idx) => {
                      const type = action?.type || 'SEND_WHATSAPP';
                      const config = action?.config || {};
                      const delayMinutes = action?.delayMinutes ?? 0;

                      const setAction = (next) => {
                        const actions = Array.isArray(newRule.actionConfig?.actions) ? [...newRule.actionConfig.actions] : [];
                        actions[idx] = { ...actions[idx], ...next };
                        setNewRule({ ...newRule, actionConfig: { ...newRule.actionConfig, actions } });
                      };

                      const setActionType = (nextType) => {
                        const nextConfigBase = { templateId: '', userId: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' };
                        if (nextType === 'SEND_WHATSAPP') setAction({ type: nextType, config: { templateId: '' } });
                        else if (nextType === 'ASSIGN_TO_USER') setAction({ type: nextType, config: { userId: '' } });
                        else if (nextType === 'CREATE_TASK') setAction({ type: nextType, config: { title: '', content: '', dueInDays: 0, assigneeId: '' } });
                        else if (nextType === 'CALL_WEBHOOK') setAction({ type: nextType, config: { eventName: '' } });
                        else if (nextType === 'MOVE_DEAL_STAGE') setAction({ type: nextType, config: { stageId: '' } });
                        else if (nextType === 'APPLY_TAG') setAction({ type: nextType, config: { tagId: '' } });
                        else setAction({ type: nextType, config: nextConfigBase });
                      };

                      return (
                        <div key={idx} className="border rounded-md p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.multiActionsAction')}</label>
                              <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                value={type}
                                onChange={(e) => setActionType(e.target.value)}
                              >
                                <option value="SEND_WHATSAPP">{t('automations.action.option.sendWhatsApp')}</option>
                                <option value="ASSIGN_TO_USER">{t('automations.action.option.assignToUser')}</option>
                                <option value="CREATE_TASK">{t('automations.action.option.createTask')}</option>
                                <option value="CALL_WEBHOOK">{t('automations.action.option.callWebhook')}</option>
                                <option value="MOVE_DEAL_STAGE">{t('automations.action.option.moveDealStage')}</option>
                                <option value="APPLY_TAG">{t('automations.action.option.applyTag')}</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              className="mt-6 inline-flex items-center px-2 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                const actions = Array.isArray(newRule.actionConfig?.actions) ? [...newRule.actionConfig.actions] : [];
                                actions.splice(idx, 1);
                                setNewRule({ ...newRule, actionConfig: { ...newRule.actionConfig, actions } });
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">{t('automations.action.delayMinutes')}</label>
                            <input
                              type="number"
                              min={0}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                              value={delayMinutes}
                              onChange={(e) => setAction({ delayMinutes: Number(e.target.value || 0) })}
                            />
                          </div>

                          {type === 'SEND_WHATSAPP' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.template')}</label>
                              <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                value={config.templateId || ''}
                                onChange={(e) => setAction({ config: { ...config, templateId: e.target.value } })}
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

                          {type === 'ASSIGN_TO_USER' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.assignTo')}</label>
                              <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                value={config.userId || ''}
                                onChange={(e) => setAction({ config: { ...config, userId: e.target.value } })}
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

                          {type === 'CREATE_TASK' && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskTitle')}</label>
                                <input
                                  type="text"
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                  value={config.title || ''}
                                  onChange={(e) => setAction({ config: { ...config, title: e.target.value } })}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskContent')}</label>
                                <textarea
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                  rows={3}
                                  value={config.content || ''}
                                  onChange={(e) => setAction({ config: { ...config, content: e.target.value } })}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskDueInDays')}</label>
                                <input
                                  type="number"
                                  min={0}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                  value={config.dueInDays ?? 0}
                                  onChange={(e) => setAction({ config: { ...config, dueInDays: Number(e.target.value || 0) } })}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskAssignee')}</label>
                                <select
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                  value={config.assigneeId || ''}
                                  onChange={(e) => setAction({ config: { ...config, assigneeId: e.target.value } })}
                                >
                                  <option value="">{t('common.unassigned')}</option>
                                  {members.map((m) => (
                                    <option key={m.member?.id} value={m.member?.id}>
                                      {m.member?.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {type === 'CALL_WEBHOOK' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.webhookEvent')}</label>
                              <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                value={config.eventName || ''}
                                onChange={(e) => setAction({ config: { ...config, eventName: e.target.value } })}
                              />
                            </div>
                          )}

                          {type === 'MOVE_DEAL_STAGE' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.moveDealStageTo')}</label>
                              <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                value={config.stageId || ''}
                                onChange={(e) => setAction({ config: { ...config, stageId: e.target.value } })}
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

                          {type === 'APPLY_TAG' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.applyTagSelect')}</label>
                              <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                                value={config.tagId || ''}
                                onChange={(e) => setAction({ config: { ...config, tagId: e.target.value } })}
                              >
                                <option value="">{t('automations.action.selectTag')}</option>
                                {tags.map((tag) => (
                                  <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800"
                      onClick={() => {
                        const actions = Array.isArray(newRule.actionConfig?.actions) ? [...newRule.actionConfig.actions] : [];
                        actions.push({ type: 'SEND_WHATSAPP', delayMinutes: 0, config: { templateId: '' } });
                        setNewRule({ ...newRule, actionConfig: { ...newRule.actionConfig, actions } });
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      {t('automations.action.addMultiAction')}
                    </button>
                  </div>
                )}

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

                {newRule.actionType === 'CREATE_TASK' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskTitle')}</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder={t('automations.action.taskTitlePlaceholder')}
                        value={newRule.actionConfig.title || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, title: e.target.value }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskContent')}</label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder={t('automations.action.taskContentPlaceholder')}
                        value={newRule.actionConfig.content || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, content: e.target.value }
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskDueInDays')}</label>
                        <input
                          type="number"
                          min={0}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          value={newRule.actionConfig.dueInDays || 0}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            actionConfig: { ...newRule.actionConfig, dueInDays: Number(e.target.value) }
                          })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskAssignee')}</label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          value={newRule.actionConfig.assigneeId || ''}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            actionConfig: { ...newRule.actionConfig, assigneeId: e.target.value }
                          })}
                        >
                          <option value="">{t('common.unassigned')}</option>
                          {members.map((m) => (
                            <option key={m.member?.id} value={m.member?.id}>
                              {m.member?.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {newRule.actionType === 'CALL_WEBHOOK' && (
                  <div className="text-sm text-gray-600">
                    {t('automations.action.callWebhookHint')}
                  </div>
                )}

                {newRule.actionType === 'MOVE_DEAL_STAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.moveDealStageTo')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.stageId || ''}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, stageId: e.target.value }
                      })}
                    >
                      <option value="">{t('automations.trigger.selectStage')}</option>
                      {allStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-gray-500">
                      {t('automations.action.moveDealStageHint')}
                    </div>
                  </div>
                )}

                {newRule.actionType === 'APPLY_TAG' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.applyTagSelect')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.tagId || ''}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, tagId: e.target.value }
                      })}
                    >
                      <option value="">{t('automations.action.selectTag')}</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-gray-500">
                      {t('automations.action.applyTagHint')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t('automations.simulate.title')}</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('automations.simulate.contactId')}</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={simulateInputs.contactId}
                    onChange={(e) => setSimulateInputs({ ...simulateInputs, contactId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('automations.simulate.dealId')}</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={simulateInputs.dealId}
                    onChange={(e) => setSimulateInputs({ ...simulateInputs, dealId: e.target.value })}
                  />
                </div>
              </div>

              {newRule.triggerType === 'INCOMING_MESSAGE' ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">{t('automations.simulate.message')}</label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={simulateInputs.message}
                    onChange={(e) => setSimulateInputs({ ...simulateInputs, message: e.target.value })}
                  />
                </div>
              ) : null}

              {simulateResult ? (
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-700">{t('automations.simulate.evaluation')}</div>
                    <pre className="mt-1 text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto">
                      {JSON.stringify(simulateResult.evaluation, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-700">{t('automations.simulate.preview')}</div>
                    <pre className="mt-1 text-xs bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto">
                      {JSON.stringify(simulateResult.preview, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-500">{t('automations.simulate.hint')}</div>
              )}
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
                type="button"
                disabled={isSimulating || isSubmitting}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                onClick={handleSimulateRule}
              >
                {isSimulating ? t('automations.simulate.simulating') : t('automations.simulate.button')}
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
