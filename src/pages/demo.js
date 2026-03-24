import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from "react-i18next";
import Logo from '@/components/Logo';
import {
  ChartBarIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { formatCurrency, getDefaultCurrencyForLang } from '@/lib/common/currency';

// Mock Data for the Interactive Board
const initialStages = [
  {
    id: 'lead',
    name: 'Novos Leads',
    color: 'bg-indigo-500',
    deals: [
      { id: '1', name: 'Software Enterprise - Acme Corp', amount: 45000, company: 'Acme Corp', priority: 'HIGH' },
      { id: '2', name: 'Migração Cloud - SkyNet', amount: 12500, company: 'SkyNet Systems', priority: 'MEDIUM' },
    ]
  },
  {
    id: 'qualified',
    name: 'Qualificados',
    color: 'bg-purple-500',
    deals: [
      { id: '3', name: 'Consultoria IA - TechFlow', amount: 8000, company: 'TechFlow Inc', priority: 'LOW' },
    ]
  },
  {
    id: 'negotiation',
    name: 'Negociação',
    color: 'bg-amber-500',
    deals: [
      { id: '4', name: 'Licenças Anuais - Globex', amount: 32000, company: 'Globex Corp', priority: 'HIGH' },
    ]
  },
  {
    id: 'closed',
    name: 'Fechados',
    color: 'bg-emerald-500',
    deals: [
      { id: '5', name: 'Suporte Premium - Umbrella', amount: 15000, company: 'Umbrella Co', priority: 'MEDIUM' },
    ]
  }
];

const DemoPage = ({ plan, hasFreePlan }) => {
  const { t, i18n } = useTranslation();
  const [stages, setStages] = useState(initialStages);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCTA(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStages = [...stages];
    const sourceStage = newStages.find(s => s.id === source.droppableId);
    const destStage = newStages.find(s => s.id === destination.droppableId);

    const [movedDeal] = sourceStage.deals.splice(source.index, 1);
    destStage.deals.splice(destination.index, 0, movedDeal);

    setStages(newStages);
  };

  const currencyCode = getDefaultCurrencyForLang(i18n.language);
  const formatValue = (amount) => formatCurrency(amount, currencyCode, i18n.language);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-executive antialiased">
      <Head>
        <title>Vysify | Interactive Demo</title>
        <meta name="description" content="Experience the future of CRM with Vysify's premium interface." />
      </Head>

      {/* Modern Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 text-zinc-400 hover:text-brand-600 transition-all group">
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{t('demo.exit', 'Sair da Demo')}</span>
            </Link>
            <div className="h-6 w-px bg-zinc-100 hidden md:block" />
            <Logo variant="full" className="h-6" />
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-brand-50/50 rounded-2xl border border-brand-100/50">
              <SparklesIcon className="w-4 h-4 text-brand-600 animate-pulse" />
              <span className="text-[11px] font-black text-brand-700 uppercase tracking-widest">{t('demo.sandboxMode', 'Modo Sandbox Premium')}</span>
            </div>
            <Link
              href="/auth/register"
              className="bg-zinc-900 text-white px-8 py-3 rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-200"
            >
              {hasFreePlan
                ? t('demo.primaryCtaFree', 'Iniciar Teste Grátis')
                : t('demo.primaryCta', 'Criar conta')}
            </Link>
          </div>
        </div>
      </header>

      {/* App Shell */}
      <main className="flex-1 flex pt-20 h-screen overflow-hidden">

        {/* Sleek Sidebar */}
        <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-100 flex-col p-8 space-y-10">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-6 ml-4">{t('demo.architecture', 'Arquitetura')}</p>
            {[
              { icon: ChartBarIcon, name: t('demo.nav.analytics', 'Estatísticas'), active: true },
              { icon: UserGroupIcon, name: t('demo.nav.pipeline', 'Funil de Vendas'), active: false },
              { icon: SparklesIcon, name: t('demo.nav.aiInsights', 'Insights por IA'), active: false },
              { icon: CurrencyDollarIcon, name: t('demo.nav.deals', 'Negócios'), active: false },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all cursor-not-allowed group ${item.active ? 'bg-zinc-50 text-brand-600 font-bold' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <item.icon className={`w-5 h-5 ${item.active ? 'text-brand-600' : 'text-zinc-300 group-hover:text-zinc-400'}`} />
                <span className="text-[15px] font-bold tracking-tight">{item.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto relative group">
            <div className="p-6 bg-zinc-900 rounded-[32px] overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none -mt-4 -mr-4"><SparklesIcon className="w-24 h-24 text-white" /></div>
              <div className="relative z-10">
                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-brand-500/40">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-black text-xs uppercase tracking-widest mb-2">{t('demo.upgradeTitle', 'Fazer Upgrade para o Pro')}</p>
                <p className="text-zinc-400 text-[11px] leading-relaxed mb-6 font-medium">
                  {t('demo.upgradeDesc', 'Desbloqueie automação avançada com IA e pipelines ilimitados para seu crescimento.')}
                </p>
                <Link href="/auth/register" className="w-full bg-white text-zinc-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-50 transition-all flex items-center justify-center shadow-lg active:scale-95">
                  {t('demo.viewPricing', 'Ver Preços')}
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Canvas */}
        <div className="flex-1 flex flex-col bg-[#F9FAFB] overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

          {/* Section Header */}
          <div className="p-10 pb-4 relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-brand-500/10 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-500/20">{t('demo.activeWorkspace', 'Workspace Ativo')}</div>
                </div>
                <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">{t('demo.pipelineControl', 'Controle Omni-Pipeline')}</h1>
                <p className="text-zinc-400 font-medium">{t('demo.pipelineDesc', 'Coordene suas operações globais com orquestração drag-and-drop em tempo real.')}</p>
              </div>
              <div className="flex gap-6">
                <div className="bg-white/40 backdrop-blur-md p-5 rounded-[28px] border border-zinc-100 shadow-xl shadow-zinc-200/50 flex items-center gap-5 min-w-[200px]">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-premium flex items-center justify-center ring-1 ring-zinc-50">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">{t('demo.liveRevenue', 'Receita Ativa')}</p>
                    <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">R$ 112.5k</p>
                  </div>
                </div>
                <div className="bg-white/40 backdrop-blur-md p-5 rounded-[28px] border border-zinc-100 shadow-xl shadow-zinc-200/50 flex items-center gap-5 min-w-[200px]">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-premium flex items-center justify-center ring-1 ring-zinc-50">
                    <ClockIcon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">{t('demo.globalSla', 'SLA Global')}</p>
                    <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">4.2m</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Board Canvas */}
          <div className="flex-1 p-10 pt-4 overflow-hidden relative z-10">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex h-full gap-8 overflow-x-auto pb-6 custom-scrollbar items-start">
                {stages.map((stage) => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col w-[340px] bg-white/40 backdrop-blur-xl rounded-[40px] p-4 h-full min-w-[340px] transition-all duration-500 border border-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.02)] ${snapshot.isDraggingOver ? 'bg-brand-50/30' : ''
                          }`}
                      >
                        <div className="flex items-center justify-between mb-6 px-4 pt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-brand-500 rounded-full shadow-[0_0_12px_rgba(20,184,166,0.4)]" />
                            <h3 className="font-black text-zinc-900 tracking-tight text-lg leading-none">{stage.name}</h3>
                          </div>
                          <span className="text-[10px] font-black text-zinc-400 bg-white px-3 py-1.5 rounded-xl border border-zinc-100 shadow-sm uppercase tracking-widest">
                            {stage.deals.length}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto rounded-[32px] p-2 custom-scrollbar space-y-5">
                          {stage.deals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white group p-6 rounded-[28px] border transition-all duration-300 ${snapshot.isDragging
                                    ? 'shadow-2xl border-brand-500/30 ring-8 ring-brand-500/5 rotate-3 scale-105 z-50 bg-white/95 backdrop-blur-sm'
                                    : 'shadow-premium border-zinc-100 hover:border-zinc-200 hover:-translate-y-1 hover:shadow-2xl'
                                    }`}
                                >
                                  <div className="mb-4 flex flex-wrap gap-2">
                                    <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100/50 rounded-full flex items-center gap-2 shadow-sm">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">85% Fit</span>
                                    </div>
                                    {deal.priority === 'HIGH' && (
                                      <div className="px-2.5 py-1 bg-zinc-900 text-white rounded-full shadow-lg shadow-zinc-900/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        🔥 Urgent
                                      </div>
                                    )}
                                  </div>

                                  <h4 className="font-black text-zinc-900 text-[16px] mb-3 leading-tight group-hover:text-brand-600 transition-colors uppercase tracking-tight">{deal.name}</h4>

                                  <div className="flex justify-between items-end mt-4">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-0.5">Valuation</span>
                                      <span className="text-[16px] font-bold text-zinc-900 tabular-nums">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.amount)}
                                      </span>
                                    </div>
                                    <div className="flex -space-x-1">
                                      <div className="w-7 h-7 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center font-black text-[10px] text-zinc-400">
                                        {deal.company.charAt(0)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-5 pt-5 border-t border-zinc-50 flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center">
                                      <SparklesIcon className="w-3 h-3 text-brand-600" />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400 truncate tracking-tight uppercase">AI analyzed recently</span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </div>
        </div>
      </main>

      {/* High-Impact CTA Overlay */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-6"
          >
            <div className="bg-zinc-900 text-white p-8 rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(20,184,166,0.1),transparent)] animate-spin-slow" />
              <div className="relative z-10 text-center md:text-left flex-1">
                <p className="text-2xl font-black tracking-tight leading-tight mb-2">{t('demo.readyForUpgrade', 'Pronto para o upgrade?')}</p>
                <p className="text-zinc-400 text-sm font-medium">{t('demo.deployInstance', 'Implemente sua própria instância do Vysify em menos de 2 minutos e escale com precisão.')}</p>
              </div>
              <Link
                href="/auth/register"
                className="relative z-10 bg-brand-500 hover:bg-brand-600 text-white px-10 py-4 rounded-[20px] font-black uppercase tracking-[0.15em] text-xs whitespace-nowrap transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-brand-500/30"
              >
                {t('demo.startTrial', 'Começar Teste')}
                <ChevronRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default DemoPage;

export const getServerSideProps = async () => {
  try {
    const { getAllPlans } = await import('@/prisma/services/plan');
    const plans = await getAllPlans();
    const activePlans = (plans || []).filter((p) => Boolean(p?.isActive));
    const hasFreePlan = activePlans.some((p) => (
      Boolean(p?.features?.isFreePlan) ||
      String(p?.slug || '').trim().toUpperCase() === 'FREE' ||
      Number(p?.price || 0) === 0
    ));

    const premiumPlan =
      activePlans.find((p) => Number(p?.price || 0) > 0) || null;

    return {
      props: {
        hasFreePlan,
        plan: premiumPlan ? {
          name: premiumPlan.name,
          price: Number(premiumPlan.price),
          priceAnnual: premiumPlan.priceAnnual ? Number(premiumPlan.priceAnnual) : null,
          currency: premiumPlan.currency,
          interval: premiumPlan.interval
        } : null
      }
    };
  } catch (e) {
    return { props: { plan: null, hasFreePlan: true } };
  }
};
