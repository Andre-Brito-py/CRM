import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

const DemoPage = ({ plan }) => {
  const [stages, setStages] = useState(initialStages);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    // Show trial CTA after 10 seconds of interaction
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

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan?.currency || 'BRL',
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Head>
        <title>Demo Interativa | Closify CRM</title>
        <meta name="description" content="Experimente o Closify CRM em tempo real." />
      </Head>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group">
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">Sair da Demo</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <img src="/images/logo-full.png" alt="Closify" className="h-7 w-auto" />
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 italic transition-all animate-pulse">
                <SparklesIcon className="w-4 h-4 text-indigo-600 mr-2" />
                <span className="text-xs font-bold text-indigo-600">Ambiente de Demonstração Interativo</span>
             </div>
             <Link 
              href="/auth/register" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
             >
                Começar Teste Grátis
             </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex pt-16 h-screen overflow-hidden">
        
        {/* Sidebar Mockup */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-6 space-y-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Principal</p>
            {[
              { icon: ChartBarIcon, name: 'Dashboard', active: true },
              { icon: UserGroupIcon, name: 'Pipeline', active: false },
              { icon: SparklesIcon, name: 'IA Insights', active: false },
              { icon: CurrencyDollarIcon, name: 'Vendas', active: false },
            ].map((item) => (
              <div 
                key={item.name} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-not-allowed group ${item.active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Configurações</p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 cursor-not-allowed italic">
                <span className="text-sm font-medium">Outros módulos...</span>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-900 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20"><SparklesIcon className="w-12 h-12 text-white" /></div>
            <p className="text-white font-bold text-xs relative z-10 mb-1">Upgrade Disponível</p>
            <p className="text-slate-400 text-[10px] relative z-10 leading-relaxed mb-3">
                Assine o plano <span className="text-white font-bold">{plan?.name || 'Pro'}</span> por apenas <span className="text-indigo-400 font-bold">{plan ? currencyFormatter.format(plan.price) : 'R$ 99'}/{plan?.interval === 'year' ? 'ano' : 'mês'}</span>.
            </p>
            <Link href="/auth/register" className="w-full bg-white text-slate-900 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors relative z-10 flex items-center justify-center">
              Ver Planos
            </Link>
          </div>
        </aside>

        {/* content window */}
        <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden">
          
          {/* Dashboard Header */}
          <div className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Visão Geral do Pipeline</h1>
                <p className="text-slate-500 mt-1 font-medium">Arraste os cards para simular o movimento de vendas real.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Estimada</p>
                    <p className="text-xl font-black text-slate-900 leading-none">R$ 112.500</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SLA Médio</p>
                    <p className="text-xl font-black text-slate-900 leading-none">4.2 min</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Draggable Board */}
          <div className="flex-1 p-8 pt-4 overflow-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex h-full gap-6 overflow-x-auto pb-4 custom-scrollbar">
                {stages.map((stage) => (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex flex-col w-80 bg-slate-200/40 rounded-3xl p-3 h-full min-w-[320px] transition-colors border border-dashed border-slate-300"
                      >
                        <div className="flex items-center justify-between mb-4 px-3">
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                             <h3 className="font-black text-slate-900 tracking-tight text-sm uppercase">{stage.name}</h3>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                            {stage.deals.length}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar">
                          {stage.deals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'rotate-2 shadow-2xl ring-2 ring-indigo-500/20' : ''}`}
                                >
                                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{deal.name}</h4>
                                  <div className="mt-4 flex items-center justify-between">
                                    <p className="text-xs font-black text-slate-900">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.amount)}
                                    </p>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                      deal.priority === 'HIGH' ? 'bg-red-50 text-red-600' :
                                      deal.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                      {deal.priority}
                                    </span>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                                     <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                        {deal.company.charAt(0)}
                                     </div>
                                     <span className="text-[10px] font-bold text-slate-400 truncate">{deal.company}</span>
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

      {/* Floating CTA Overlay */}
      <AnimatePresence>
        {showCTA && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4"
          >
            <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl shadow-indigo-500/30 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
              <div className="relative z-10 text-center sm:text-left">
                <p className="text-lg font-black tracking-tight leading-tight mb-1">Gostou do que viu?</p>
                <p className="text-slate-400 text-sm">Crie sua conta real e conecte seu WhatsApp em menos de 2 minutos.</p>
              </div>
              <Link 
                href="/auth/register"
                className="relative z-10 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs whitespace-nowrap transition-transform active:scale-95 flex items-center gap-2"
              >
                Ativar Teste Grátis
                <ChevronRightIcon className="w-4 h-4" />
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
    // Get the first active paid plan to showcase in the sidebar
    const premiumPlan = plans.find(p => p.isActive && Number(p.price) > 0) || null;
    
    return {
      props: {
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
    return { props: { plan: null } };
  }
};
