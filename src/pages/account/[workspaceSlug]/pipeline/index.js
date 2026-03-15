import { useEffect, useState } from 'react';
import { PlusIcon, SparklesIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import usePipelines from '@/hooks/data/usePipelines';
import { useWorkspace } from '@/providers/workspace';
import PipelineBoard from '@/sections/pipeline/Board';
import AddDealModal from '@/sections/pipeline/AddDealModal';
import Paywall from '@/components/Paywall/index';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const Pipeline = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { data, isLoading } = usePipelines(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  // AI Insights
  const [aiInsights, setAiInsights] = useState(null);
  const [dealInsights, setDealInsights] = useState({});
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiOverageOptIn, setAiOverageOptIn] = useState(false);

  // For MVP we only use the first pipeline
  const pipeline = data?.pipelines?.[0];

  const toggleModal = () => setModalOpen(!isModalOpen);

  useEffect(() => {
    if (!workspace?.slug) return;
    try {
      const v = localStorage.getItem(`aiOverageOptIn:${workspace.slug}`);
      setAiOverageOptIn(v === 'true');
    } catch { }
  }, [workspace?.slug]);

  const pipelineSteps = [
    {
      element: '#pipeline-add-deal-btn',
      popover: {
        title: t('onboarding.tour.pipeline.step1.title'),
        description: t('onboarding.tour.pipeline.step1.desc'),
        position: 'bottom',
      },
    },
    {
      element: '#pipeline-board',
      popover: {
        title: t('onboarding.tour.pipeline.step2.title'),
        description: t('onboarding.tour.pipeline.step2.desc'),
        position: 'top',
      },
    },
    {
      element: '#pipeline-ai-insights-btn',
      popover: {
        title: t('onboarding.tour.pipeline.step3.title'),
        description: t('onboarding.tour.pipeline.step3.desc'),
        position: 'bottom',
      },
    },
  ];

  const generateInsights = async () => {
    if (!pipeline) return;
    setIsGeneratingInsights(true);
    try {
      const response = await api(`/api/workspace/${workspace?.slug}/pipelines/${pipeline.id}/insights`, {
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
              localStorage.setItem(`aiOverageOptIn:${workspace.slug}`, 'true');
            } catch { }
            setAiOverageOptIn(true);
            const retry = await api(`/api/workspace/${workspace?.slug}/pipelines/${pipeline.id}/insights`, {
              method: 'POST',
              headers: { 'x-ai-overage': 'true' },
            });
            if (retry.data?.insights) {
              if (retry.data?.quota?.tokens?.warn) {
                const r = retry.data?.quota?.tokens?.remaining;
                const l = retry.data?.quota?.tokens?.limit;
                toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
              }
              setAiInsights(retry.data.insights);
              if (retry.data.deals) {
                const insightsMap = {};
                retry.data.deals.forEach(d => { insightsMap[d.id] = d; });
                setDealInsights(insightsMap);
              }
              toast.success('Insights generated!');
              return;
            }
          }
        }

        toast.error(response?.error?.details || 'Failed to generate insights');
        return;
      }

      if (response.data?.insights) {
        if (response.data?.quota?.tokens?.warn) {
          const r = response.data?.quota?.tokens?.remaining;
          const l = response.data?.quota?.tokens?.limit;
          toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
        }
        setAiInsights(response.data.insights);
        if (response.data.deals) {
          const insightsMap = {};
          response.data.deals.forEach(d => { insightsMap[d.id] = d; });
          setDealInsights(insightsMap);
        }
        toast.success('Insights generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <AccountLayout>
      <OnboardingTour tourId="pipeline-tour" steps={pipelineSteps} />
      <Meta title={`Closify - ${workspace?.name} | Pipeline`} />
      <Content.Title
        title="Pipeline"
        subtitle="Orchestrate your sales funnel with precision"
        className="font-executive"
      />
      <Content.Divider />
      <div className="flex-1 flex flex-col h-full overflow-hidden px-5 py-5 md:px-10">
        <div className="flex flex-col mb-8 space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <h2 className="text-2xl font-executive font-bold text-zinc-900 tracking-tight">
              {pipeline?.name || 'Sales Pipeline'}
            </h2>
            {pipeline && (
              <Paywall minPlan="STANDARD" compact>
                <button
                  id="pipeline-ai-insights-btn"
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                  className="flex items-center justify-center px-5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all duration-300 shadow-sm shadow-indigo-500/5 group disabled:opacity-50"
                >
                  {isGeneratingInsights ? (
                    <span className="animate-pulse">Analyzing...</span>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 mr-2 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                      Get AI Insights
                    </>
                  )}
                </button>
              </Paywall>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={workspace?.slug ? `/api/workspace/${workspace.slug}/export?format=csv&entity=deals` : '#'}
              className="flex items-center justify-center px-6 py-3 text-zinc-600 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 shadow-sm font-medium text-sm group"
              onClick={(e) => {
                if (!workspace?.slug) e.preventDefault();
              }}
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
              Export Deals CSV
            </a>
            <button
              id="pipeline-add-deal-btn"
              className="flex items-center justify-center px-8 py-3 text-white bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all duration-300 shadow-xl shadow-zinc-900/20 active:scale-95 font-bold text-sm"
              onClick={toggleModal}
            >
              <PlusIcon className="w-5 h-5 mr-2 stroke-[3]" />
              Add Deal
            </button>
          </div>
        </div>

        {aiInsights && (
          <div className="mb-10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-8 rounded-[32px] border border-white/10 relative shadow-2xl shadow-indigo-900/20 overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
            <button
              onClick={() => setAiInsights(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="flex items-start relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mr-6 border border-white/10 shadow-inner">
                <SparklesIcon className="w-6 h-6 text-indigo-200" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-executive font-bold text-white mb-3 tracking-tight">AI Pipeline Intelligence</h3>
                <p className="text-[15px] text-indigo-100/90 leading-relaxed font-medium whitespace-pre-wrap">{aiInsights}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="w-16 h-16 border-[6px] border-zinc-100 border-t-indigo-600 rounded-full animate-spin mb-6 shadow-xl shadow-indigo-500/10"></div>
            <p className="text-zinc-500 font-bold tracking-[0.15em] text-xs uppercase">Orchestrating segments...</p>
          </div>
        ) : pipeline ? (
          <PipelineBoard pipeline={pipeline} workspaceSlug={workspace?.slug} dealAiInsights={dealInsights} />
        ) : (
          <Content.Empty>
            No pipeline found. Please contact support.
          </Content.Empty>
        )}
      </div>
      <AddDealModal
        isOpen={isModalOpen}
        toggle={toggleModal}
        slug={workspace?.slug}
        stages={pipeline?.stages}
      />
    </AccountLayout>
  );
};

export default Pipeline;
