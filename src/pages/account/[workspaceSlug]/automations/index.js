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

const Automations = () => {
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
      toast.error('Please provide a rule name');
      return;
    }

    if (newRule.triggerType === 'DEAL_STAGE_CHANGED' && !newRule.triggerConfig.stageId) {
      toast.error('Please select a stage');
      return;
    }

    if (newRule.actionType === 'SEND_WHATSAPP' && !newRule.actionConfig.templateId) {
      toast.error('Please select a template');
      return;
    }

    if (newRule.actionType === 'ASSIGN_TO_USER' && !newRule.actionConfig.userId) {
      toast.error('Please select a user');
      return;
    }

    setIsSubmitting(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/automations`, {
        method: 'POST',
        body: newRule,
      });
      toast.success('Automation rule created successfully');
      mutate(`/api/workspace/${workspaceSlug}/automations`);
      toggleModal();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create automation rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/automations`, {
        method: 'DELETE',
        body: { id }
      });
      toast.success('Rule deleted');
      mutate(`/api/workspace/${workspaceSlug}/automations`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete rule');
    }
  };

  const renderTriggerDescription = (rule) => {
    if (rule.triggerType === 'DEAL_STAGE_CHANGED') {
      const stageName = allStages.find(s => s.id === rule.triggerConfig?.stageId)?.name || 'Unknown Stage';
      return (
        <span>When Deal Stage changes to <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">{stageName}</span></span>
      );
    } else if (rule.triggerType === 'INCOMING_MESSAGE') {
      const keywords = rule.triggerConfig?.keywords;
      return (
        <span>When Incoming Message {keywords ? <span>contains <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{keywords}</span></span> : 'received'}</span>
      );
    }
    return <span>{rule.triggerType}</span>;
  };

  const renderActionDescription = (rule) => {
    if (rule.actionType === 'SEND_WHATSAPP') {
      const templateName = templates.find(t => t.id === rule.actionConfig?.templateId)?.name || 'Unknown Template';
      return (
        <span>Send WhatsApp Template <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">{templateName}</span></span>
      );
    } else if (rule.actionType === 'ASSIGN_TO_USER') {
      const member = members.find(m => m.member?.id === rule.actionConfig?.userId);
      const memberName = member?.member?.name || 'Unknown User';
      return (
        <span>Assign to User <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{memberName}</span></span>
      );
    }
    return <span>{rule.actionType}</span>;
  };

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | Automations`} />
      <Content.Title
        title="Automations"
        subtitle="Automate your workflow with event-based rules"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-end mb-5">
          <button
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Rule
          </button>
        </div>

        {automations.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <BoltIcon className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No automations</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new automation rule.</p>
            <div className="mt-6">
              <button
                onClick={toggleModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                New Rule
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
                          <span className="font-semibold mr-2 w-16">Trigger:</span>
                          {renderTriggerDescription(rule)}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-semibold mr-2 w-16">Action:</span>
                          {renderActionDescription(rule)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Rule"
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
          title="Create Automation Rule"
        >
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rule Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                placeholder="e.g. Welcome Message"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Trigger</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">When this happens...</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                    value={newRule.triggerType}
                    onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })}
                  >
                    <option value="DEAL_STAGE_CHANGED">Deal Stage Changed</option>
                    <option value="INCOMING_MESSAGE">Incoming Message</option>
                  </select>
                </div>

                {newRule.triggerType === 'DEAL_STAGE_CHANGED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Stage</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.triggerConfig.stageId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        triggerConfig: { ...newRule.triggerConfig, stageId: e.target.value }
                      })}
                    >
                      <option value="">Select a stage</option>
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
                    <label className="block text-sm font-medium text-gray-700">Keywords (Optional, comma separated)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="e.g. help, support, price"
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
              <h4 className="text-sm font-medium text-gray-900 mb-2">Action</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Do this...</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                    value={newRule.actionType}
                    onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value })}
                  >
                    <option value="SEND_WHATSAPP">Send WhatsApp Message</option>
                    <option value="ASSIGN_TO_USER">Assign to User</option>
                  </select>
                </div>

                {newRule.actionType === 'SEND_WHATSAPP' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message Template</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.templateId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, templateId: e.target.value }
                      })}
                    >
                      <option value="">Select a template</option>
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
                    <label className="block text-sm font-medium text-gray-700">Assign to</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={newRule.actionConfig.userId}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        actionConfig: { ...newRule.actionConfig, userId: e.target.value }
                      })}
                    >
                      <option value="">Select a user</option>
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </form>
        </Modal>
      </Content.Container>
    </AccountLayout>
  );
};

export default Automations;
