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
      <Meta title={`Vysify - ${workspace?.name} | Pipeline`} />
      <div className="flex flex-col gap-2 mb-10 px-6 sm:px-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none">Pipeline</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Visualize e acelere o fluxo de vendas do seu negócio</p>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden px-6 sm:px-10 pb-10">
        <div className="flex flex-col mb-10 space-y-6 lg:flex-row lg:justify-between lg:items-end lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 opacity-80 pl-1">Funil Ativo</span>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                {pipeline?.name || 'Sales Pipeline'}
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
              </h2>
            </div>
            {pipeline && (
              <Paywall minPlan="STANDARD" compact>
                <button
                  id="pipeline-ai-insights-btn"
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                  className="group relative px-6 py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-300 disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-2 relative z-10">
                    {isGeneratingInsights ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <SparklesIcon className="w-4 h-4 text-white/90" />
                    )}
                    <span className="text-xs font-black uppercase tracking-widest">{isGeneratingInsights ? 'Analisando...' : 'IA Insights'}</span>
                  </div>
                </button>
              </Paywall>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={workspace?.slug ? `/api/workspace/${workspace.slug}/export?format=csv&entity=deals` : '#'}
              className="flex items-center justify-center px-6 py-3 text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all duration-300 shadow-sm font-bold text-xs uppercase tracking-widest group"
              onClick={(e) => {
                if (!workspace?.slug) e.preventDefault();
              }}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2.5 text-zinc-400 group-hover:rotate-12 transition-transform" />
              Exportar
            </a>
            <button
              id="pipeline-add-deal-btn"
              className="flex items-center justify-center px-10 py-3.5 text-white bg-zinc-900 dark:bg-indigo-600 rounded-2xl hover:bg-zinc-800 dark:hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-zinc-900/10 dark:shadow-indigo-600/20 active:scale-95 font-black text-xs uppercase tracking-[0.1em]"
              onClick={toggleModal}
            >
              <PlusIcon className="w-5 h-5 mr-1.5 stroke-[4]" />
              Novo Negócio
            </button>
          </div>
        </div>

        {aiInsights && (
          <div className="mb-12 bg-gradient-to-br from-indigo-900 via-[#1e1b4b] to-zinc-950 p-10 rounded-[2.5rem] border border-white/5 relative shadow-3xl shadow-indigo-950/40 overflow-hidden group animate-in zoom-in-95 duration-500">
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <button
              onClick={() => setAiInsights(null)}
              className="absolute top-6 right-6 p-2 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all z-20"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:flex-row items-start gap-8 relative z-10 text-left">
              <div className="w-16 h-16 bg-white/5 rounded-[20px] flex items-center justify-center shrink-0 border border-white/10 shadow-2xl">
                <SparklesIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">Pipeline Intelligence</h3>
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">Análise Preditiva</span>
                </div>
                <p className="text-[17px] text-indigo-100/80 leading-relaxed font-medium whitespace-pre-wrap selection:bg-indigo-500/30">{aiInsights}</p>
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
