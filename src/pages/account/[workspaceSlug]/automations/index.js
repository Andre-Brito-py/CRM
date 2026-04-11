import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

import AccountLayout from '@/layouts/AccountLayout';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from 'react-i18next';
import usePlanFeatures from '@/hooks/data/usePlanFeatures';

const Automations = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useWorkspace();
  const { allowedModules } = usePlanFeatures();
  const emailMarketingEnabled = allowedModules?.email_marketing !== false;

  // State for modal and form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStep, setModalStep] = useState(1);
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
    actionConfig: { surveyId: '', channel: 'whatsapp', templateId: '', userId: '', subject: '', body: '', from: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '', userIdToNotify: '', link: '' }
  });

  const automationSteps = [
    {
      element: '#create-rule-btn',
      popover: {
        title: t('onboarding.tour.automations.step1.title', 'Crie uma automação'),
        description: t('onboarding.tour.automations.step1.desc', 'Clique aqui para criar uma regra de automação.'),
        position: 'left',
      }
    },
    {
      element: '#automations-list',
      popover: {
        title: t('onboarding.tour.automations.step2.title', 'Lista de automações'),
        description: t('onboarding.tour.automations.step2.desc', 'Aqui você vê e gerencia suas regras.'),
        position: 'top',
      }
    }
  ];

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
  const { data: npsSurveysData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/surveys` : null
  );

  const automations = automationsData?.data?.rules || automationsData?.data?.automations || [];
  const pipelines = pipelinesData?.data?.pipelines || [];
  const templates = templatesData?.data?.templates || [];
  const members = membersData?.data?.members || [];
  const tags = tagsData?.data?.tags || [];
  const logs = logsData?.data?.logs || [];
  const npsSurveys = npsSurveysData?.data?.surveys || [];

  // Helper to get all stages from all pipelines
  const allStages = pipelines.flatMap(p => p.stages || []);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    // Reset form when opening
    if (!isModalOpen) {
      setSimulateResult(null);
      setSimulateInputs({ contactId: '', dealId: '', message: '' });
      setModalStep(1);
      setNewRule({
        name: '',
        triggerType: 'DEAL_STAGE_CHANGED',
        triggerConfig: { stageId: '', keywords: '', tagId: '', platform: '', operator: 'AND', hours: { start: null, end: null } },
        actionType: 'SEND_WHATSAPP',
        actionConfig: { surveyId: '', channel: 'whatsapp', templateId: '', userId: '', subject: '', body: '', from: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' }
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

      const isMessageEvent =
        newRule.triggerType === 'INCOMING_MESSAGE' ||
        newRule.triggerType === 'EMAIL_SENT';
      const defaultPlatform = newRule.triggerType === 'EMAIL_SENT' ? 'EMAIL' : 'WHATSAPP';

      const eventData =
        isMessageEvent
          ? {
            ...baseEventData,
            message: { content: simulateInputs.message || '' },
            conversation: { platform: newRule.triggerConfig.platform || defaultPlatform },
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

    if (newRule.actionType === 'SEND_EMAIL' && (!newRule.actionConfig.subject || !newRule.actionConfig.body)) {
      toast.error(t('automations.validation.emailRequired'));
      return;
    }

    if (newRule.actionType === 'AUTO_REPLY_AI') {
      const cooldown = newRule.actionConfig?.cooldownMinutes;
      if (cooldown !== undefined && cooldown !== null && cooldown !== '' && (!Number.isFinite(Number(cooldown)) || Number(cooldown) < 0)) {
        toast.error(t('automations.validation.cooldownInvalid', 'Cooldown inválido'));
        return;
      }
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

    if (newRule.actionType === 'SEND_NOTIFICATION' && (!newRule.actionConfig.userIdToNotify || !newRule.actionConfig.title)) {
      toast.error('User and Title are required for notifications');
      return;
    }

    if (newRule.actionType === 'SEND_NPS' && !newRule.actionConfig.surveyId) {
      toast.error(t('automations.validation.surveyRequired', 'A pesquisa NPS é obrigatória'));
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

        if (type === 'SEND_EMAIL' && (!cfg.subject || !cfg.body)) {
          toast.error(t('automations.validation.emailRequired'));
          return;
        }

        if (type === 'AUTO_REPLY_AI') {
          const cooldown = cfg?.cooldownMinutes;
          if (cooldown !== undefined && cooldown !== null && cooldown !== '' && (!Number.isFinite(Number(cooldown)) || Number(cooldown) < 0)) {
            toast.error(t('automations.validation.cooldownInvalid', 'Cooldown inválido'));
            return;
          }
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
              <span className="ml-1 px-2 py-0.5 bg-brand-100 text-blue-800 rounded text-xs">{keywords}</span>
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
    } else if (rule.triggerType === 'EMAIL_SENT') {
      const keywords = rule.triggerConfig?.keywords;
      return (
        <span>
          {t('automations.trigger.emailSent')}{' '}
          {keywords ? (
            <span>
              {t('automations.trigger.contains')}{' '}
              <span className="ml-1 px-2 py-0.5 bg-brand-100 text-blue-800 rounded text-xs">{keywords}</span>
            </span>
          ) : (
            t('automations.trigger.sent')
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
          <span className="ml-1 px-2 py-0.5 bg-brand-100 text-blue-800 rounded text-xs">{tagName}</span>
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
    } else if (rule.actionType === 'SEND_NOTIFICATION') {
      const member = members.find(m => m.member?.id === rule.actionConfig?.userIdToNotify);
      const memberName = member?.member?.name || t('automations.unknownUser');
      return (
        <span>
          Send Notification to <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">{memberName}</span>
        </span>
      );
    } else if (rule.actionType === 'SEND_NPS') {
      const surveyName = npsSurveys.find(s => s.id === rule.actionConfig?.surveyId)?.name || t('automations.unknownSurvey', 'Pesquisa Desconhecida');
      const channel = rule.actionConfig?.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail';
      return (
        <span>
          {t('automations.action.sendNps', 'Enviar Pesquisa NPS')}{' '}
          <span className="ml-1 px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-xs">{surveyName}</span>
          <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">{channel}</span>
        </span>
      );
    }
    return <span>{rule.actionType}</span>;
  };

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace?.name} | ${t('Automations')}`} />
      <Content>
        <OnboardingTour tourId="automations-tour" steps={automationSteps} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-[14px] flex items-center justify-center shadow-glow-indigo/20">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">{t('automations.hero.badge')}</span>
            </div>
            <h1 className="text-4xl font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter italic uppercase leading-none mb-3">
              {t('automations.hero.title1')}<span className="text-indigo-600">{t('automations.hero.title2')}</span>
            </h1>
            <p className="text-zinc-500 font-medium text-lg max-w-xl leading-relaxed italic">
              {t('automations.hero.subtitle')}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            id="create-rule-btn"
            className="flex items-center px-8 py-4 text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/25 font-black text-[11px] uppercase tracking-widest italic"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-3 stroke-[3]" />
            {t('automations.createRule')}
          </motion.button>
        </motion.div>

        {automations.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="vysify-glass p-20 text-center rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800/50"
          >
             <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 rounded-[32px] shadow-premium flex items-center justify-center mx-auto border border-zinc-100 dark:border-zinc-800">
                <BoltIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-executive font-extrabold text-zinc-900 dark:text-white uppercase italic tracking-tight mb-3">
              {t('automations.empty.title1')}<span className="text-zinc-400 font-medium">{t('automations.empty.title2')}</span>
            </h3>
            <p className="text-zinc-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed italic">
              {t('automations.empty.subtitle')}
            </p>
            <button
              onClick={toggleModal}
              className="inline-flex items-center px-8 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
            >
              <PlusIcon className="mr-3 h-5 w-5 stroke-[3]" aria-hidden="true" />
              {t('automations.newRule')}
            </button>
          </motion.div>
        ) : (
          <div id="automations-list" className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {automations.map((rule, idx) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="vysify-glass p-8 rounded-[2.5rem] hover:shadow-2xl transition-all duration-500 border border-zinc-100/50 dark:border-zinc-800/50 group"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border italic ${
                          rule.isActive 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                            : 'bg-zinc-50 dark:bg-zinc-900/30 text-zinc-400 border-zinc-100 dark:border-zinc-800'
                        }`}>
                          {rule.isActive ? 'Operation Active' : 'Operation Paused'}
                        </span>
                        <h3 className="text-xl font-executive font-extrabold text-zinc-950 dark:text-white uppercase italic tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                          {rule.name}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800/50">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-800">
                            <BoltIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Trigger Event</span>
                            <div className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 italic">
                              {renderTriggerDescription(rule)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-800">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Automated Action</span>
                            <div className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 italic">
                              {renderActionDescription(rule)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pl-0 lg:pl-8 border-l-0 lg:border-l border-zinc-100 dark:border-zinc-800 lg:h-20">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title={t('automations.deleteRule')}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                      <ArrowRightIcon className="w-5 h-5 text-zinc-200 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-20"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-zinc-950 dark:bg-zinc-800 rounded-[14px] flex items-center justify-center shadow-glow-zinc/20">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none italic uppercase">
                {t('automations.logs.title')} <span className="text-indigo-600">History</span>
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 italic">{t('automations.logs.subtitle')}</p>
            </div>
          </div>

          <div className="vysify-glass rounded-[2.5rem] overflow-hidden border border-zinc-100/50 dark:border-zinc-800/50 shadow-2xl">
            {logs.length === 0 ? (
              <div className="py-20 text-center text-zinc-400 italic text-sm">{t('automations.logs.empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-50 dark:divide-zinc-800/30">
                  <thead className="bg-zinc-50/30 dark:bg-zinc-900/30 backdrop-blur-md">
                    <tr>
                      <th className="px-10 py-6 text-left text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">{t('automations.logs.table.time')}</th>
                      <th className="px-10 py-6 text-left text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">{t('automations.logs.table.event')}</th>
                      <th className="px-10 py-6 text-left text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">{t('automations.logs.table.related')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/30">
                    {logs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="px-10 py-6 text-xs text-zinc-500 font-mono italic whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic ${
                              log.type === 'AUTOMATION_FAILED' 
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            }`}>
                              {log.type === 'AUTOMATION_FAILED' ? t('automations.logs.status.failed') : t('automations.logs.status.executed')}
                            </span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{log.title}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-xs text-zinc-500">
                          <div className="flex flex-wrap gap-3 italic">
                            {log.contact?.name ? (
                              <span className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                                {t('automations.logs.related.contact')}: <span className="text-zinc-900 dark:text-zinc-300 font-bold">{log.contact.name}</span>
                              </span>
                            ) : null}
                            {log.deal?.name ? (
                              <span className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                                {t('automations.logs.related.deal')}: <span className="text-zinc-900 dark:text-zinc-300 font-bold">{log.deal.name}</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
        <Modal
          show={isModalOpen}
          toggle={toggleModal}
          title={
            <div className="flex flex-col">
              <span>{t('automations.modal.title')}</span>
              <div className="flex items-center space-x-2 mt-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-full rounded-full ${modalStep >= s ? 'bg-brand-600' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          }
        >
          <form onSubmit={handleCreateRule} className="space-y-4">
            {modalStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('automations.form.ruleName')}</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.triggerType}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          triggerType: e.target.value,
                          triggerConfig: { stageId: '', keywords: '', tagId: '', platform: '', hours: { start: null, end: null }, requireAutopilotEnabled: false }
                        })}
                      >
                        <option value="DEAL_STAGE_CHANGED">{t('automations.trigger.option.dealStageChanged')}</option>
                        <option value="CONTACT_TAG_ADDED">{t('automations.trigger.option.contactTagAdded', 'Tag adicionada ao contato')}</option>
                        <option value="INCOMING_MESSAGE">{t('automations.trigger.option.incomingMessage')}</option>
                        <option value="AUTOPILOT_ENABLED">{t('automations.trigger.option.autopilotEnabled')}</option>
                        <option value="EMAIL_SENT">{t('automations.trigger.option.emailSent')}</option>
                        <option value="PAYMENT_CREATED">{t('automations.trigger.option.paymentCreated')}</option>
                        <option value="PAYMENT_PAID">{t('automations.trigger.option.paymentPaid')}</option>
                        <option value="PAYMENT_FAILED">{t('automations.trigger.option.paymentFailed')}</option>
                        <option value="NPS_RESPONSE_RECEIVED">{t('automations.trigger.option.npsResponseReceived')}</option>
                        <option value="NPS_PROMOTER">{t('automations.trigger.option.npsPromoter')}</option>
                        <option value="NPS_DETRACTOR">{t('automations.trigger.option.npsDetractor')}</option>
                        <option value="SLA_BREACH">SLA Breach</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {newRule.triggerType === 'DEAL_STAGE_CHANGED' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.targetStage')}</label>
                      <select
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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

                  {newRule.triggerType === 'CONTACT_TAG_ADDED' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.applyTagSelect')}</label>
                      <select
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.triggerConfig.tagId || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          triggerConfig: { ...newRule.triggerConfig, tagId: e.target.value }
                        })}
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

                  {(newRule.triggerType === 'INCOMING_MESSAGE' || newRule.triggerType === 'EMAIL_SENT') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.keywords')}</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                          value={newRule.triggerConfig.platform || ''}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            triggerConfig: { ...newRule.triggerConfig, platform: e.target.value }
                          })}
                        >
                          <option value="">{t('automations.trigger.filter.anyChannel')}</option>
                          <option value="WHATSAPP">WHATSAPP</option>
                          <option value="EMAIL">EMAIL</option>
                          <option value="INSTAGRAM">INSTAGRAM</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.requireAutopilot')}</label>
                        <label className="mt-1 inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(newRule.triggerConfig?.requireAutopilotEnabled)}
                            onChange={(e) => setNewRule({
                              ...newRule,
                              triggerConfig: { ...newRule.triggerConfig, requireAutopilotEnabled: e.target.checked }
                            })}
                          />
                          {t('automations.trigger.filter.requireAutopilotHelp')}
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('automations.trigger.filter.startHour')}</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
              )}

            {modalStep === 3 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('automations.action.title')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.doThis')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.actionType}
                        onChange={(e) => {
                          const next = e.target.value;
                          const base = { templateId: '', userId: '', subject: '', body: '', from: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '', objective: '', cooldownMinutes: 0 };
                          if (next === 'SEND_WHATSAPP') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'SEND_EMAIL') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'AUTO_REPLY_AI') setNewRule({ ...newRule, actionType: next, actionConfig: { objective: '', cooldownMinutes: 0 } });
                          else if (next === 'ASSIGN_TO_USER') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'CREATE_TASK') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'CALL_WEBHOOK') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'MOVE_DEAL_STAGE') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'APPLY_TAG') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'UPDATE_CUSTOM_FIELD') setNewRule({ ...newRule, actionType: next, actionConfig: { ...base, customFieldKey: '', customFieldValue: '' } });
                          else if (next === 'STOP_AUTOMATIONS') setNewRule({ ...newRule, actionType: next, actionConfig: base });
                          else if (next === 'MULTI_ACTIONS') setNewRule({
                            ...newRule,
                            actionType: next,
                            actionConfig: {
                              actions: [
                                { type: 'SEND_WHATSAPP', delayMinutes: 0, config: { templateId: '' } }
                              ]
                            }
                          });
                          else if (next === 'SEND_NOTIFICATION') setNewRule({ ...newRule, actionType: next, actionConfig: { ...base, userIdToNotify: '' } });
                          else if (next === 'SEND_NPS') setNewRule({ ...newRule, actionType: next, actionConfig: { ...base, surveyId: '', channel: 'whatsapp' } });
                          else setNewRule({ ...newRule, actionType: next, actionConfig: base });
                        }}
                      >
                        <option value="SEND_WHATSAPP">{t('automations.action.option.sendWhatsApp')}</option>
                        {emailMarketingEnabled && (
                          <option value="SEND_EMAIL">{t('automations.action.option.sendEmail')}</option>
                        )}
                        <option value="AUTO_REPLY_AI">{t('automations.action.option.autoReplyAi')}</option>
                        <option value="ASSIGN_TO_USER">{t('automations.action.option.assignToUser')}</option>
                        <option value="CREATE_TASK">{t('automations.action.option.createTask')}</option>
                        <option value="CALL_WEBHOOK">{t('automations.action.option.callWebhook')}</option>
                        <option value="MOVE_DEAL_STAGE">{t('automations.action.option.moveDealStage')}</option>
                        <option value="APPLY_TAG">{t('automations.action.option.applyTag')}</option>
                        <option value="UPDATE_CUSTOM_FIELD">{t('automations.action.option.updateCustomField', 'Atualizar Campo Personalizado')}</option>
                        <option value="STOP_AUTOMATIONS">{t('automations.action.option.stopAutomations', 'Parar outras automações')}</option>
                        <option value="SEND_NOTIFICATION">Send In-App Notification</option>
                        <option value="SEND_NPS">{t('automations.action.option.sendNps', 'Enviar Pesquisa NPS')}</option>
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
                            const nextConfigBase = { templateId: '', userId: '', subject: '', body: '', from: '', title: '', content: '', dueInDays: 0, assigneeId: '', stageId: '', tagId: '' };
                            if (nextType === 'SEND_WHATSAPP') setAction({ type: nextType, config: { templateId: '' } });
                            else if (nextType === 'SEND_EMAIL') setAction({ type: nextType, config: { subject: '', body: '', from: '' } });
                            else if (nextType === 'AUTO_REPLY_AI') setAction({ type: nextType, config: { objective: '', cooldownMinutes: 0 } });
                            else if (nextType === 'ASSIGN_TO_USER') setAction({ type: nextType, config: { userId: '' } });
                            else if (nextType === 'CREATE_TASK') setAction({ type: nextType, config: { title: '', content: '', dueInDays: 0, assigneeId: '' } });
                            else if (nextType === 'CALL_WEBHOOK') setAction({ type: nextType, config: { eventName: '' } });
                            else if (nextType === 'MOVE_DEAL_STAGE') setAction({ type: nextType, config: { stageId: '' } });
                            else if (nextType === 'APPLY_TAG') setAction({ type: nextType, config: { tagId: '' } });
                            else if (nextType === 'SEND_NOTIFICATION') setAction({ type: nextType, config: { userIdToNotify: '', title: '', content: '', link: '' } });
                            else if (nextType === 'SEND_NPS') setAction({ type: nextType, config: { surveyId: '', channel: 'whatsapp', message: '', subject: '', body: '' } });
                            else setAction({ type: nextType, config: nextConfigBase });
                          };

                          return (
                            <div key={idx} className="border rounded-md p-3 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <label className="block text-sm font-medium text-gray-700">{t('automations.action.multiActionsAction')}</label>
                                  <select
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                                    value={type}
                                    onChange={(e) => setActionType(e.target.value)}
                                  >
                                    <option value="SEND_WHATSAPP">{t('automations.action.option.sendWhatsApp')}</option>
                                    {emailMarketingEnabled && (
                                      <option value="SEND_EMAIL">{t('automations.action.option.sendEmail')}</option>
                                    )}
                                    <option value="AUTO_REPLY_AI">{t('automations.action.option.autoReplyAi')}</option>
                                    <option value="ASSIGN_TO_USER">{t('automations.action.option.assignToUser')}</option>
                                    <option value="CREATE_TASK">{t('automations.action.option.createTask')}</option>
                                    <option value="CALL_WEBHOOK">{t('automations.action.option.callWebhook')}</option>
                                    <option value="MOVE_DEAL_STAGE">{t('automations.action.option.moveDealStage')}</option>
                                    <option value="APPLY_TAG">{t('automations.action.option.applyTag')}</option>
                                    <option value="SEND_NOTIFICATION">Send Notification</option>
                                    <option value="SEND_NPS">{t('automations.action.option.sendNps', 'Enviar Pesquisa NPS')}</option>
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
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={delayMinutes}
                                  onChange={(e) => setAction({ delayMinutes: Number(e.target.value || 0) })}
                                />
                              </div>

                              {type === 'SEND_WHATSAPP' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">{t('automations.action.template')}</label>
                                  <select
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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

                          {type === 'SEND_EMAIL' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailTemplate')}</label>
                                <select
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.templateId || ''}
                                  onChange={(e) => {
                                    const templateId = e.target.value;
                                    const tpl = templates.find((x) => x.id === templateId);
                                    setAction({
                                      config: {
                                        ...config,
                                        templateId,
                                        body: tpl?.content ?? (config.body || ''),
                                      },
                                    });
                                  }}
                                >
                                  <option value="">{t('automations.action.selectTemplate')}</option>
                                  {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                      {template.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailSubject')}</label>
                                <input
                                  type="text"
                                  required
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.subject || ''}
                                  onChange={(e) => setAction({ config: { ...config, subject: e.target.value } })}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailBody')}</label>
                                <textarea
                                  rows={5}
                                  required
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.body || ''}
                                  onChange={(e) => setAction({ config: { ...config, body: e.target.value } })}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailFrom')}</label>
                                <input
                                  type="email"
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.from || ''}
                                  onChange={(e) => setAction({ config: { ...config, from: e.target.value } })}
                                />
                              </div>
                            </>
                          )}

                          {type === 'AUTO_REPLY_AI' && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.aiObjective')}</label>
                                <select
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                                  value={config.objective || ''}
                                  onChange={(e) => setAction({ config: { ...config, objective: e.target.value } })}
                                >
                                  <option value="">{t('automations.action.aiObjectivePlaceholder', 'Padrão')}</option>
                                  <option value="support">{t('inbox.ai.objective.support')}</option>
                                  <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                                  <option value="close">{t('inbox.ai.objective.close')}</option>
                                  <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.aiCooldownMinutes')}</label>
                                <input
                                  type="number"
                                  min={0}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={Number(config.cooldownMinutes || 0)}
                                  onChange={(e) => setAction({ config: { ...config, cooldownMinutes: Number(e.target.value || 0) } })}
                                />
                              </div>
                            </div>
                          )}

                          {type === 'SEND_NPS' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.selectSurvey', 'Selecionar Pesquisa')}</label>
                                <select
                                  required
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                                  value={config.surveyId || ''}
                                  onChange={(e) => setAction({ config: { ...config, surveyId: e.target.value } })}
                                >
                                  <option value="">{t('automations.action.selectSurveyPlaceholder', 'Selecione uma pesquisa')}</option>
                                  {npsSurveys.map((survey) => (
                                    <option key={survey.id} value={survey.id}>
                                      {survey.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.channel', 'Canal')}</label>
                                <select
                                  required
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                                  value={config.channel || 'whatsapp'}
                                  onChange={(e) => setAction({ config: { ...config, channel: e.target.value } })}
                                >
                                  <option value="whatsapp">{t('automations.action.channel.whatsapp', 'WhatsApp')}</option>
                                  <option value="email">{t('automations.action.channel.email', 'E-mail')}</option>
                                </select>
                              </div>
                              {config.channel === 'whatsapp' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">{t('automations.action.message', 'Mensagem (Opcional)')}</label>
                                  <textarea
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                    placeholder={t('automations.action.messagePlaceholder', 'Olá {{contact.firstName}}, pode nos avaliar?')}
                                    value={config.message || ''}
                                    onChange={(e) => setAction({ config: { ...config, message: e.target.value } })}
                                  />
                                </div>
                              )}
                              {config.channel === 'email' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailSubject', 'Assunto do E-mail')}</label>
                                    <input
                                      type="text"
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                      placeholder={t('automations.action.emailSubjectPlaceholder', 'Sua opinião é importante')}
                                      value={config.subject || ''}
                                      onChange={(e) => setAction({ config: { ...config, subject: e.target.value } })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailBody', 'Corpo do E-mail (Opcional)')}</label>
                                    <textarea
                                      rows={3}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                      placeholder={t('automations.action.emailBodyPlaceholder', 'Olá {{contact.firstName}}, como foi sua experiência?')}
                                      value={config.body || ''}
                                      onChange={(e) => setAction({ config: { ...config, body: e.target.value } })}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {type === 'ASSIGN_TO_USER' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">{t('automations.action.assignTo')}</label>
                              <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.title || ''}
                                  onChange={(e) => setAction({ config: { ...config, title: e.target.value } })}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskContent')}</label>
                                <textarea
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                                  value={config.dueInDays ?? 0}
                                  onChange={(e) => setAction({ config: { ...config, dueInDays: Number(e.target.value || 0) } })}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">{t('automations.action.taskAssignee')}</label>
                                <select
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
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
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
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
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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

                {newRule.actionType === 'SEND_EMAIL' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailTemplate')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={newRule.actionConfig.templateId || ''}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          const tpl = templates.find((x) => x.id === templateId);
                          setNewRule({
                            ...newRule,
                            actionConfig: {
                              ...newRule.actionConfig,
                              templateId,
                              body: tpl?.content ?? (newRule.actionConfig.body || ''),
                            },
                          });
                        }}
                      >
                        <option value="">{t('automations.action.selectTemplate')}</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailSubject')}</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={newRule.actionConfig.subject || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, subject: e.target.value }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailBody')}</label>
                      <textarea
                        rows={5}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={newRule.actionConfig.body || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, body: e.target.value }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailFrom')}</label>
                      <input
                        type="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={newRule.actionConfig.from || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, from: e.target.value }
                        })}
                      />
                    </div>
                  </>
                )}

                {newRule.actionType === 'AUTO_REPLY_AI' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.aiObjective')}</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.actionConfig.objective || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, objective: e.target.value }
                        })}
                      >
                        <option value="">{t('automations.action.aiObjectivePlaceholder', 'Padrão')}</option>
                        <option value="support">{t('inbox.ai.objective.support')}</option>
                        <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                        <option value="close">{t('inbox.ai.objective.close')}</option>
                        <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.aiCooldownMinutes')}</label>
                      <input
                        type="number"
                        min={0}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={Number(newRule.actionConfig.cooldownMinutes || 0)}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, cooldownMinutes: Number(e.target.value || 0) }
                        })}
                      />
                    </div>
                  </div>
                )}

                {newRule.actionType === 'ASSIGN_TO_USER' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('automations.action.assignTo')}</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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

                {newRule.actionType === 'SEND_NOTIFICATION' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User to notify</label>
                      <select
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.actionConfig.userIdToNotify || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, userIdToNotify: e.target.value }
                        })}
                      >
                        <option value="">Select User</option>
                        {members.map((m) => (
                          <option key={m.member?.id} value={m.member?.id}>
                            {m.member?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notification Title</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        placeholder="e.g. New deal created: {{deal.name}}"
                        value={newRule.actionConfig.title || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, title: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notification Content (Optional)</label>
                      <textarea
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        placeholder="e.g. A new deal has been assigned to you."
                        value={newRule.actionConfig.content || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, content: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Click Link (Optional)</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        placeholder="e.g. /account/workspace-slug/deals"
                        value={newRule.actionConfig.link || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, link: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}

                {newRule.actionType === 'UPDATE_CUSTOM_FIELD' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.customFieldKey')}</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        placeholder="e.g. data_nascimento"
                        value={newRule.actionConfig.customFieldKey || ''}
                        onChange={(e) => setNewRule({ ...newRule, actionConfig: { ...newRule.actionConfig, customFieldKey: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.customFieldValue')}</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        placeholder="e.g. 2024-01-01"
                        value={newRule.actionConfig.customFieldValue || ''}
                        onChange={(e) => setNewRule({ ...newRule, actionConfig: { ...newRule.actionConfig, customFieldValue: e.target.value } })}
                      />
                    </div>
                  </div>
                )}

                {newRule.actionType === 'STOP_AUTOMATIONS' && (
                  <div className="text-sm text-gray-600">
                    {t('automations.action.stopAutomationsHint')}
                  </div>
                )}

                {newRule.actionType === 'SEND_NPS' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.selectSurvey', 'Selecionar Pesquisa')}</label>
                      <select
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.actionConfig.surveyId || ''}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, surveyId: e.target.value }
                        })}
                      >
                        <option value="">{t('automations.action.selectSurveyPlaceholder', 'Selecione uma pesquisa')}</option>
                        {npsSurveys.map((survey) => (
                          <option key={survey.id} value={survey.id}>
                            {survey.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.action.channel', 'Canal')}</label>
                      <select
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2 bg-white"
                        value={newRule.actionConfig.channel || 'whatsapp'}
                        onChange={(e) => setNewRule({
                          ...newRule,
                          actionConfig: { ...newRule.actionConfig, channel: e.target.value }
                        })}
                      >
                        <option value="whatsapp">{t('automations.action.channel.whatsapp', 'WhatsApp')}</option>
                        <option value="email">{t('automations.action.channel.email', 'E-mail')}</option>
                      </select>
                    </div>
                    {newRule.actionConfig.channel === 'whatsapp' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('automations.action.message', 'Mensagem (Opcional)')}</label>
                        <textarea
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                          placeholder={t('automations.action.messagePlaceholder', 'Olá {{contact.firstName}}, pode nos avaliar?')}
                          value={newRule.actionConfig.message || ''}
                          onChange={(e) => setNewRule({
                            ...newRule,
                            actionConfig: { ...newRule.actionConfig, message: e.target.value }
                          })}
                        />
                      </div>
                    )}
                    {newRule.actionConfig.channel === 'email' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailSubject', 'Assunto do E-mail')}</label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                            placeholder={t('automations.action.emailSubjectPlaceholder', 'Sua opinião é importante')}
                            value={newRule.actionConfig.subject || ''}
                            onChange={(e) => setNewRule({
                              ...newRule,
                              actionConfig: { ...newRule.actionConfig, subject: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">{t('automations.action.emailBody', 'Corpo do E-mail (Opcional)')}</label>
                          <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                            placeholder={t('automations.action.emailBodyPlaceholder', 'Olá {{contact.firstName}}, como foi sua experiência?')}
                            value={newRule.actionConfig.body || ''}
                            onChange={(e) => setNewRule({
                              ...newRule,
                              actionConfig: { ...newRule.actionConfig, body: e.target.value }
                            })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                </div>
              </div>
            </div>
          )}

          {modalStep === 4 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('automations.simulate.title')}</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.simulate.contactId')}</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
                        value={simulateInputs.contactId}
                        onChange={(e) => setSimulateInputs({ ...simulateInputs, contactId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('automations.simulate.dealId')}</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border p-2"
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
              </div>
            )}

            <div className="mt-5 sm:mt-6 flex justify-end space-x-2 border-t pt-4">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm"
                onClick={toggleModal}
              >
                {t('common.action.cancel')}
              </button>

              {modalStep > 1 && (
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm"
                  onClick={() => setModalStep(modalStep - 1)}
                >
                  {t('onboarding.tour.btn.prev')}
                </button>
              )}

              {modalStep < 4 ? (
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm"
                  onClick={() => setModalStep(modalStep + 1)}
                >
                  {t('onboarding.tour.btn.next')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSimulating || isSubmitting}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                    onClick={handleSimulateRule}
                  >
                    {isSimulating ? t('automations.simulate.simulating') : t('automations.simulate.button')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? t('automations.creating') : t('automations.createRule')}
                  </button>
                </>
              )}
            </div>
          </form>
        </Modal>
      </Content>
    </AccountLayout>
  );
};

export default Automations;
