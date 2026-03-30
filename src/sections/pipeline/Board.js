import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSWRConfig } from 'swr';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BuildingOfficeIcon, UserCircleIcon, FireIcon, CurrencyDollarIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import api from '@/lib/common/api';

const BoardColumn = ({ stage, deals, workspaceSlug, dealAiInsights, index }) => {
  const router = useRouter();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="flex flex-col flex-shrink-0 w-[350px] bg-zinc-50/40 dark:bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] p-5 mr-8 border border-white/40 dark:border-zinc-800/40 shadow-2xl shadow-zinc-200/20 dark:shadow-none transition-all duration-500 hover:border-indigo-500/20"
    >
      <div className="flex items-center justify-between mb-8 px-3 pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
            <h3 className="font-black text-zinc-900 dark:text-white tracking-tight text-xl uppercase italic pb-0.5">{stage.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="bg-white/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 text-[10px] font-black px-3.5 py-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm uppercase tracking-widest backdrop-blur-md">
             {deals.length} NEGÓCIOS
           </span>
        </div>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 overflow-y-auto min-h-[650px] rounded-[2rem] p-2.5 transition-all duration-300 custom-scrollbar ${
              snapshot.isDraggingOver ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
            }`}
          >
            <AnimatePresence mode="popLayout">
              {deals.map((deal, idx) => (
                <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                  {(provided, snapshot) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => router.push(`/account/${workspaceSlug}/deals/${deal.id}`)}
                      className={`group p-6 mb-6 rounded-[2rem] border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                        snapshot.isDragging 
                          ? 'bg-white dark:bg-zinc-800 shadow-3xl border-indigo-500/50 ring-8 ring-indigo-500/5 rotate-2 scale-105 z-50' 
                          : 'bg-white dark:bg-zinc-800/80 border-white/60 dark:border-zinc-700 shadow-premium hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:-translate-y-1.5 hover:shadow-2xl hover:bg-white dark:hover:bg-zinc-800'
                      }`}
                      style={provided.draggableProps.style}
                    >
                      {/* Deal Background Accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />

                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4 gap-4">
                        <div className="font-black text-zinc-900 dark:text-zinc-100 text-[17px] leading-[1.3] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors min-w-0 break-words">
                          {deal.name}
                        </div>
                        <div className="shrink-0 pt-1">
                          {deal.priority === 'HIGH' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/30 shrink-0" title="Alta Prioridade" />
                          )}
                        </div>
                      </div>

                      {/* AI Indicators */}
                      {dealAiInsights?.[deal.id] && (
                        <div className="mb-6 flex flex-wrap gap-2.5">
                          <div className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2 shadow-sm transition-all group-hover:shadow-md ${
                            dealAiInsights[deal.id].probability >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' :
                            dealAiInsights[deal.id].probability >= 40 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/50' :
                            'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/50'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${dealAiInsights[deal.id].probability >= 70 ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{dealAiInsights[deal.id].probability}%</span>
                          </div>
                          {dealAiInsights[deal.id].urgency === 'high' && (
                            <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5">
                              <FireIcon className="w-3.5 h-3.5 text-white/90" />
                              Quente
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Financial Info */}
                      <div className="flex flex-col mb-6">
                        <div className="flex items-center gap-1.5 mb-1 opacity-40">
                          <CurrencyDollarIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                          <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Valor do Contrato</span>
                        </div>
                        <span className="text-xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">
                          {deal.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.amount) : 'Consultar'}
                        </span>
                      </div>

                      {/* Footer Section */}
                      {(deal.company || deal.user) && (
                        <div className="pt-5 border-t border-zinc-100/60 dark:border-zinc-700/50 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {deal.company ? (
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                  <BuildingOfficeIcon className="w-4.5 h-4.5 text-zinc-400" />
                                </div>
                                <span className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400 truncate tracking-tight">{deal.company.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-600">
                                <EllipsisHorizontalIcon className="w-4 h-4" />
                                <span className="text-[11px] font-bold italic">Sem Empresa</span>
                              </div>
                            )}
                          </div>
                          {deal.user && (
                            <div className="shrink-0">
                              {deal.user.image ? (
                                <Image src={deal.user.image} alt={deal.user.name} width={34} height={34} className="w-9 h-9 rounded-2xl object-cover ring-4 ring-white dark:ring-zinc-800 shadow-xl group-hover:ring-indigo-50 dark:group-hover:ring-indigo-900/30 transition-all duration-300" />
                              ) : (
                                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-[12px] ring-4 ring-white dark:ring-zinc-800 shadow-xl border border-indigo-100/50 dark:border-indigo-800/50">
                                  {deal.user.name?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </motion.div>
  );
};

const PipelineBoard = ({ pipeline, workspaceSlug, dealAiInsights }) => {
  const { mutate } = useSWRConfig();
  const [stages, setStages] = useState([]);

  useEffect(() => {
    if (pipeline?.stages) {
      const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order);
      setStages(sortedStages);
    }
  }, [pipeline]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStages = [...stages];
    const sourceStageIndex = newStages.findIndex(s => s.id === source.droppableId);
    const destStageIndex = newStages.findIndex(s => s.id === destination.droppableId);

    const sourceStage = newStages[sourceStageIndex];
    const destStage = newStages[destStageIndex];

    const [movedDeal] = sourceStage.deals.splice(source.index, 1);
    destStage.deals.splice(destination.index, 0, movedDeal);

    setStages(newStages);

    try {
      await api(`/api/workspace/${workspaceSlug}/deals`, {
        method: 'PUT',
        body: {
          id: draggableId,
          stageId: destination.droppableId,
        }
      });
      mutate(`/api/workspace/${workspaceSlug}/pipelines`);
    } catch (error) {
      console.error('Failed to move deal', error);
      mutate(`/api/workspace/${workspaceSlug}/pipelines`);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div id="pipeline-board" className="flex h-full overflow-x-auto pb-16 pt-6 px-4 items-start custom-scrollbar gap-2">
        {stages.map((stage, index) => (
          <BoardColumn
            key={stage.id}
            index={index}
            stage={stage}
            deals={stage.deals || []}
            workspaceSlug={workspaceSlug}
            dealAiInsights={dealAiInsights}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default PipelineBoard;
