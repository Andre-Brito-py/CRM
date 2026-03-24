import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { getSession, useSession } from 'next-auth/react';
import { PlusIcon, XMarkIcon, PencilIcon, SparklesIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import useDeal from '@/hooks/data/useDeal';
import useTasks from '@/hooks/data/useTasks';
import usePipelines from '@/hooks/data/usePipelines';
import AddTaskModal from '@/sections/tasks/AddTaskModal';
import EditDealModal from '@/sections/pipeline/EditDealModal';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import fetcher from '@/lib/client/fetcher';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const DealDetails = ({ workspace, isTeamOwner }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug, dealId } = router.query;
  const { data: session } = useSession();
  const { setWorkspace } = useWorkspace();
  const { deal, isLoading, mutate } = useDeal(workspaceSlug, dealId);
  const { tasks } = useTasks(workspaceSlug, { dealId, page: 1, pageSize: 200 });
  const { data: pipelinesData } = usePipelines(workspaceSlug);

  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const toggleAddTaskModal = () => setAddTaskModalOpen(!isAddTaskModalOpen);

  const [isEditDealModalOpen, setEditDealModalOpen] = useState(false);
  const toggleEditDealModal = () => setEditDealModalOpen(!isEditDealModalOpen);

  const [activityForm, setActivityForm] = useState({
    type: 'NOTE',
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    value: '',
    description: '',
    billingType: 'PIX',
    dueDate: new Date().toISOString().slice(0, 10),
    sendWhatsApp: true,
    whatsAppMessage: '',
  });

  const dealSteps = [
    {
      element: '#ai-assistant-card',
      popover: {
        title: t('onboarding.tour.deals.step1.title'),
        description: t('onboarding.tour.deals.step1.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#deal-info-card',
      popover: {
        title: t('onboarding.tour.deals.step2.title'),
        description: t('onboarding.tour.deals.step2.desc'),
        position: 'bottom',
      }
    },
    {
      element: '#payments-section-card',
      popover: {
        title: t('onboarding.tour.deals.step3.title'),
        description: t('onboarding.tour.deals.step3.desc'),
        position: 'top',
      }
    }
  ];

  // AI Features
  const [aiNextStep, setAiNextStep] = useState(null);
  const [isGeneratingNextStep, setIsGeneratingNextStep] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState(null);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [aiOverageOptIn, setAiOverageOptIn] = useState(false);

  const generateNextStep = async () => {
    setIsGeneratingNextStep(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/deals/${dealId}/next-steps`, {
        method: 'POST',
        headers: aiOverageOptIn ? { 'x-ai-overage': 'true' } : undefined,
      });

      if (response.status >= 400 || response.error) {
        const msg = response?.error?.msg || '';
        const overage = response?.error?.overage;
        if (msg === 'LIMIT_REACHED' && overage?.enabled) {
          const price = overage?.pricePer1M ? Number(overage.pricePer1M) : null;
          const confirmation = window.confirm(
            t('inbox.ai.overagePrompt', { price: price != null ? String(price) : '' })
          );
          if (confirmation) {
            try {
              localStorage.setItem(`aiOverageOptIn:${workspaceSlug}`, 'true');
            } catch { }
            setAiOverageOptIn(true);
            const retry = await api(`/api/workspace/${workspaceSlug}/deals/${dealId}/next-steps`, {
              method: 'POST',
              headers: { 'x-ai-overage': 'true' },
            });
            if (retry.data?.recommendation) {
              if (retry.data?.quota?.tokens?.warn) {
                const r = retry.data?.quota?.tokens?.remaining;
                const l = retry.data?.quota?.tokens?.limit;
                toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
              }
              setAiNextStep(retry.data.recommendation);
              toast.success('Recommendation generated!');
              return;
            }
          }
        }

        toast.error(response?.error?.details || 'Failed to generate recommendation');
        return;
      }

      if (response.data?.recommendation) {
        if (response.data?.quota?.tokens?.warn) {
          const r = response.data?.quota?.tokens?.remaining;
          const l = response.data?.quota?.tokens?.limit;
          toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
        }
        setAiNextStep(response.data.recommendation);
        toast.success('Recommendation generated!');
      }
    } catch (error) {
      toast.error('Failed to generate recommendation');
    } finally {
      setIsGeneratingNextStep(false);
    }
  };

  const generateFollowUp = async () => {
    setIsGeneratingFollowUp(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/deals/${dealId}/follow-up`, {
        method: 'POST',
        headers: aiOverageOptIn ? { 'x-ai-overage': 'true' } : undefined,
      });

      if (response.status >= 400 || response.error) {
        const msg = response?.error?.msg || '';
        const overage = response?.error?.overage;
        if (msg === 'LIMIT_REACHED' && overage?.enabled) {
          const price = overage?.pricePer1M ? Number(overage.pricePer1M) : null;
          const confirmation = window.confirm(
            t('inbox.ai.overagePrompt', { price: price != null ? String(price) : '' })
          );
          if (confirmation) {
            try {
              localStorage.setItem(`aiOverageOptIn:${workspaceSlug}`, 'true');
            } catch { }
            setAiOverageOptIn(true);
            const retry = await api(`/api/workspace/${workspaceSlug}/deals/${dealId}/follow-up`, {
              method: 'POST',
              headers: { 'x-ai-overage': 'true' },
            });
            if (retry.data?.message) {
              if (retry.data?.quota?.tokens?.warn) {
                const r = retry.data?.quota?.tokens?.remaining;
                const l = retry.data?.quota?.tokens?.limit;
                toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
              }
              setAiFollowUp(retry.data.message);
              toast.success('Follow-up message generated!');
              return;
            }
          }
        }

        toast.error(response?.error?.details || 'Failed to generate follow-up');
        return;
      }

      if (response.data?.message) {
        if (response.data?.quota?.tokens?.warn) {
          const r = response.data?.quota?.tokens?.remaining;
          const l = response.data?.quota?.tokens?.limit;
          toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
        }
        setAiFollowUp(response.data.message);
        toast.success('Follow-up message generated!');
      }
    } catch (error) {
      toast.error('Failed to generate follow-up');
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  useEffect(() => {
    if (workspace) {
      setWorkspace(workspace);
    }
  }, [workspace, setWorkspace]);

  useEffect(() => {
    if (!workspaceSlug) return;
    try {
      const v = localStorage.getItem(`aiOverageOptIn:${workspaceSlug}`);
      setAiOverageOptIn(v === 'true');
    } catch { }
  }, [workspaceSlug]);

  const { data: paymentsData, mutate: mutatePayments } = useSWR(
    workspaceSlug && dealId ? `/api/workspace/${workspaceSlug}/payments?dealId=${dealId}` : null,
    fetcher
  );
  const payments = paymentsData?.data?.payments || [];

  const saveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/deals/${dealId}/activities`, {
        method: 'POST',
        body: activityForm,
      });
      mutate();
      toast.success('Activity added');
      setIsAddingActivity(false);
      setActivityForm({
        type: 'NOTE',
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      toast.error('Failed to add activity');
    }
  };

  const handleTaskComplete = async (taskId, isCompleted) => {
    try {
      await api(`/api/workspace/${workspaceSlug}/tasks/${taskId}`, {
        method: 'PUT',
        body: { isCompleted },
      });
      toast.success('Task updated');
      // Ideally mutate tasks here, but useTasks hook handles it if we import mutate from it
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const toggleCreatePayment = () => {
    setIsCreatePaymentOpen((v) => !v);
  };

  const createPayment = async (e) => {
    e.preventDefault();
    setIsCreatingPayment(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/payments`, {
        method: 'POST',
        body: {
          dealId,
          value: paymentForm.value,
          description: paymentForm.description || null,
          billingType: paymentForm.billingType,
          dueDate: paymentForm.dueDate,
          sendWhatsApp: Boolean(paymentForm.sendWhatsApp),
          whatsAppMessage: paymentForm.whatsAppMessage || null,
        },
      });

      if (response?.error) {
        toast.error(response.error.msg || 'Failed to create payment');
        if (response?.error?.code === 'PAYMENT_NOT_CONFIGURED') {
          const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
          const isOwner = !isSuperAdmin && Boolean(isTeamOwner);
          const target = isSuperAdmin
            ? `/admin/finance/workspace-payment-settings?workspaceSlug=${encodeURIComponent(String(workspaceSlug || ''))}`
            : isOwner
              ? String(response?.error?.cta || `/account/${workspaceSlug}/settings/payments`)
              : null;

          if (target) {
            const go = confirm('Pagamentos não configurados para este workspace. Abrir configurações agora?');
            if (go) {
              router.push(target);
            }
          }
        }
        return;
      }

      await mutatePayments();
      toast.success('Payment created');
      setPaymentForm({
        value: '',
        description: '',
        billingType: 'PIX',
        dueDate: new Date().toISOString().slice(0, 10),
        sendWhatsApp: true,
        whatsAppMessage: '',
      });
      setIsCreatePaymentOpen(false);
    } catch (error) {
      toast.error('Failed to create payment');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <Content.Skeleton />
      </AccountLayout>
    );
  }

  if (!deal) {
    return (
      <AccountLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold">Deal not found</h2>
          <Link href={`/account/${workspaceSlug}/pipeline`} className="text-brand-600 hover:underline mt-4">
            Go back to Pipeline
          </Link>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <OnboardingTour tourId="deal-details-tour" steps={dealSteps} />
      <Meta title={`${deal.name} | Vysify`} />
      <Content>
        <Content.Title
          title={deal.name}
          subtitle="Deal Details"
        />
        <Content.Divider />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8 space-y-6">

            {/* AI Smart Assistant */}
            <div id="ai-assistant-card" className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg shadow border border-purple-100">
              <div className="flex items-center mb-4">
                <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Smart Sales Assistant</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Next Best Action */}
                <div className="bg-white p-4 rounded-md border border-purple-100 shadow-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Next Best Action</h4>
                  {aiNextStep ? (
                    <div className="text-sm text-gray-600 animate-fadeIn">
                      <p className="whitespace-pre-wrap">{aiNextStep}</p>
                      <button
                        onClick={() => setAiNextStep(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateNextStep}
                      disabled={isGeneratingNextStep}
                      className="w-full py-2 px-3 bg-white border border-purple-200 text-purple-700 text-sm rounded hover:bg-purple-50 flex justify-center items-center"
                    >
                      {isGeneratingNextStep ? (
                        <span className="animate-pulse">Analyzing deal...</span>
                      ) : (
                        <>Get Recommendation</>
                      )}
                    </button>
                  )}
                </div>

                {/* Follow-up Generator */}
                <div className="bg-white p-4 rounded-md border border-purple-100 shadow-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Follow-up Message</h4>
                  {aiFollowUp ? (
                    <div className="text-sm text-gray-600 animate-fadeIn">
                      <div className="bg-gray-50 p-2 rounded border border-gray-100 mb-2 max-h-40 overflow-y-auto">
                        <p className="whitespace-pre-wrap text-xs">{aiFollowUp}</p>
                      </div>
                      <div className="flex justify-between">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiFollowUp);
                            toast.success('Copied to clipboard');
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => setAiFollowUp(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateFollowUp}
                      disabled={isGeneratingFollowUp}
                      className="w-full py-2 px-3 bg-white border border-purple-200 text-purple-700 text-sm rounded hover:bg-purple-50 flex justify-center items-center"
                    >
                      {isGeneratingFollowUp ? (
                        <span className="animate-pulse">Drafting message...</span>
                      ) : (
                        <><ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-2" /> Generate Follow-up</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Deal Info */}
            <div id="deal-info-card" className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Details</h3>
                <button
                  onClick={toggleEditDealModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Amount</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {deal.amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(deal.amount) : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stage</label>
                  <div className="mt-1 text-sm text-gray-900">{deal.stage?.name || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Close Date</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Priority</label>
                  <div className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${deal.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                        deal.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}>
                      {deal.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contact</label>
                  <div className="mt-1 text-sm text-brand-600 hover:underline">
                    {deal.contact ? (
                      <Link href={`/account/${workspaceSlug}/contacts/${deal.contact.id}`}>
                        {deal.contact.name || deal.contact.email}
                      </Link>
                    ) : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Assignee</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {deal.user ? (
                      <>
                        {deal.user.image ? (
                          <img src={deal.user.image} alt={deal.user.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                            {deal.user.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-sm text-gray-900">{deal.user.name}</span>
                      </>
                    ) : <span className="text-sm text-gray-900">-</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                <button
                  onClick={toggleAddTaskModal}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Task
                </button>
              </div>

              <div className="space-y-3">
                {tasks && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-start p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex-shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                          checked={task.isCompleted}
                          onChange={(e) => handleTaskComplete(task.id, e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          <Link href={`/account/${workspaceSlug}/tasks/${task.id}`} className="hover:underline">
                            {task.title}
                          </Link>
                        </div>
                        {task.dueDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="ml-auto">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No tasks associated with this deal.</p>
                )}
              </div>
            </div>

            <div id="payments-section-card" className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payments</h3>
                <button
                  onClick={toggleCreatePayment}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Create
                </button>
              </div>

              {isCreatePaymentOpen && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <form onSubmit={createPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Value</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={paymentForm.value}
                          onChange={(e) => setPaymentForm({ ...paymentForm, value: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Due date</label>
                        <input
                          type="date"
                          value={paymentForm.dueDate}
                          onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Billing type</label>
                        <select
                          value={paymentForm.billingType}
                          onChange={(e) => setPaymentForm({ ...paymentForm, billingType: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                        >
                          <option value="PIX">PIX</option>
                          <option value="BOLETO">Boleto</option>
                          <option value="CREDIT_CARD">Cartão</option>
                          <option value="UNDEFINED">Checkout</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Description</label>
                        <input
                          type="text"
                          value={paymentForm.description}
                          onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="sendWhatsAppDealPayment"
                        type="checkbox"
                        checked={paymentForm.sendWhatsApp}
                        onChange={(e) => setPaymentForm({ ...paymentForm, sendWhatsApp: e.target.checked })}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      />
                      <label htmlFor="sendWhatsAppDealPayment" className="ml-2 block text-sm text-gray-700">
                        Send via WhatsApp
                      </label>
                    </div>

                    {paymentForm.sendWhatsApp && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700">WhatsApp message (optional)</label>
                        <textarea
                          value={paymentForm.whatsAppMessage}
                          onChange={(e) => setPaymentForm({ ...paymentForm, whatsAppMessage: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                          rows={3}
                          placeholder="Olá {{contact.firstName}}, segue o link para pagamento: {{payment.invoiceUrl}}"
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={toggleCreatePayment}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingPayment}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
                      >
                        {isCreatingPayment ? 'Creating...' : 'Create payment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{p.status}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.value) || 0)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          {p.invoiceUrl ? (
                            <a href={p.invoiceUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                              Open
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">
                          No payments yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activities Section */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Activities</h3>
                <button
                  onClick={() => setIsAddingActivity(!isAddingActivity)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-brand-700 bg-brand-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> Log Activity
                </button>
              </div>

              {isAddingActivity && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Log new activity</h4>
                  <form onSubmit={saveActivity} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Type</label>
                        <select
                          value={activityForm.type}
                          onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                        >
                          <option value="NOTE">Note</option>
                          <option value="CALL">Call</option>
                          <option value="MEETING">Meeting</option>
                          <option value="EMAIL">Email</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Date</label>
                        <input
                          type="date"
                          value={activityForm.date}
                          onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                          className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Title / Summary</label>
                      <input
                        type="text"
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                        placeholder="e.g. Discovery call with client"
                        required
                        className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Details</label>
                      <textarea
                        rows={3}
                        value={activityForm.content}
                        onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                        placeholder="Add more details..."
                        className="mt-1 block w-full shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingActivity(false)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                      >
                        Save Activity
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {deal.activities?.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== deal.activities.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white 
                              ${activity.type === 'CALL' ? 'bg-green-500' :
                                  activity.type === 'MEETING' ? 'bg-purple-500' :
                                    activity.type === 'EMAIL' ? 'bg-brand-500' :
                                      'bg-gray-500'}`}
                            >
                              <span className="text-white text-xs font-bold">{activity.type[0]}</span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {activity.title} <span className="font-medium text-gray-900">by {activity.user?.name || 'Unknown'}</span>
                              </p>
                              {activity.content && (
                                <p className="mt-1 text-sm text-gray-600">{activity.content}</p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={activity.date}>{new Date(activity.date).toLocaleDateString()}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {(!deal.activities || deal.activities.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No activities logged yet.</p>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 space-y-6">
            {/* Sidebar or additional info could go here */}
          </div>
        </div>
      </Content>
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        toggle={toggleAddTaskModal}
        slug={workspaceSlug}
        initialDealId={dealId}
        initialContactId={deal.contact?.id}
      />
      <EditDealModal
        isOpen={isEditDealModalOpen}
        toggle={toggleEditDealModal}
        slug={workspaceSlug}
        deal={deal}
        stages={pipelinesData?.pipelines?.[0]?.stages}
      />
    </AccountLayout>
  );
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  let isTeamOwner = false;
  let workspace = null;

  if (session) {
    const { getWorkspace, isWorkspaceOwner } = await import('@/prisma/services/workspace');
    const { workspaceSlug } = context.params;
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      workspaceSlug
    );

    if (workspace) {
      isTeamOwner = isWorkspaceOwner(session.user.email, workspace);
    }
  }

  if (!workspace) {
    return { notFound: true };
  }

  return {
    props: {
      isTeamOwner,
      workspace,
    },
  };
}

export default DealDetails;
