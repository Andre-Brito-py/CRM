import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSWRConfig } from 'swr';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BuildingOfficeIcon, UserCircleIcon, FireIcon, CurrencyDollarIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import api from '@/lib/common/api';

const BoardColumn = ({ stage, deals: initialDeals, workspaceSlug, dealAiInsights, index, pipelineId }) => {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ hasMore: initialDeals.length === 50 }); // Assume hasMore if we hit initial limit
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync with props if they change (e.g. after drag and drop mutate)
  useEffect(() => {
    setDeals(initialDeals);
    setPage(1);
    setMeta({ hasMore: initialDeals.length === 50 });
  }, [initialDeals]);

  const loadMore = async () => {
    if (isLoadingMore || !meta.hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api(`/api/workspace/${workspaceSlug}/pipelines/${pipelineId}/stages/${stage.id}/deals?page=${nextPage}&pageSize=50`);
      if (response.data?.deals) {
        setDeals(prev => [...prev, ...response.data.deals]);
        setPage(nextPage);
        setMeta(response.data.meta);
      }
    } catch (error) {
      console.error('Failed to load more deals:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8 }}
      className="flex flex-col flex-shrink-0 w-[380px] vysify-glass rounded-[3rem] p-6 mr-10 border border-zinc-100 dark:border-zinc-800/50 shadow-premium group transition-all duration-700"
    >
      <div className="flex items-center justify-between mb-10 px-4 pt-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-glow-indigo/50 animate-pulse" />
            <h3 className="font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter text-xl uppercase italic leading-none">{stage.name}</h3>
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] italic ml-5">Active Deal Segment</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[9px] font-black px-4 py-2 rounded-2xl shadow-xl uppercase tracking-widest italic translate-y-[-4px]">
             {meta.total || deals.length}
           </span>
        </div>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 overflow-y-auto min-h-[700px] rounded-[2.5rem] p-3 transition-all duration-500 custom-scrollbar ${
              snapshot.isDraggingOver ? 'bg-indigo-50/20 dark:bg-indigo-900/10 scale-[0.99] ring-2 ring-indigo-500/20' : ''
            }`}
          >
            <AnimatePresence mode="popLayout">
              {deals.map((deal, idx) => (
                <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                  {(provided, snapshot) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => router.push(`/account/${workspaceSlug}/deals/${deal.id}`)}
                      className={`group p-8 mb-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                        snapshot.isDragging 
                          ? 'bg-white dark:bg-zinc-900 shadow-3xl border-indigo-500/40 rotate-1 scale-105 z-50 ring-0' 
                          : 'bg-white/80 dark:bg-zinc-900/80 border-transparent dark:border-zinc-800/30 shadow-premium-sm hover:border-indigo-500/20 dark:hover:border-indigo-500/20 hover:shadow-premium hover:bg-white dark:hover:bg-zinc-900'
                      }`}
                      style={provided.draggableProps.style}
                    >
                      {/* Premium Accent */}
                      <div className="absolute top-0 left-0 w-2 h-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-600 transition-colors" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-1000" />

                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-5 gap-5 ml-2">
                        <div>
                          <h4 className="font-executive font-extrabold text-zinc-950 dark:text-zinc-100 text-[19px] leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all tracking-tight italic uppercase mb-1">
                            {deal.name}
                          </h4>
                        </div>
                        <div className="shrink-0 pt-1">
                          {deal.priority === 'HIGH' && (
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest italic">Critical</span>
                               <div className="w-2 h-2 rounded-full bg-rose-500 shadow-glow-rose/40 animate-pulse" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Intelligence Layer */}
                      {dealAiInsights?.[deal.id] && (
                        <div className="mb-8 flex flex-wrap gap-3 ml-2">
                          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 transition-all ${
                            dealAiInsights[deal.id].probability >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' :
                            dealAiInsights[deal.id].probability >= 40 ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/30' :
                            'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/30'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${dealAiInsights[deal.id].probability >= 70 ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] italic">{dealAiInsights[deal.id].probability}% Prob.</span>
                          </div>
                          {dealAiInsights[deal.id].urgency === 'high' && (
                            <div className="px-4 py-2 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-zinc-950/20 text-[9px] font-black uppercase tracking-[0.15em] italic flex items-center gap-2">
                              <FireIcon className="w-4 h-4 text-orange-400" />
                              Accelerant
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Economic Value */}
                      <div className="mb-8 ml-2">
                        <div className="flex items-center gap-2 mb-2">
                          <CurrencyDollarIcon className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] italic">Valuation Estimate</span>
                        </div>
                        <div className="flex items-end gap-1.5">
                          <span className="text-2xl font-executive font-black text-zinc-950 dark:text-white leading-none tracking-tighter">
                            {deal.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.amount) : 'CONSULT'}
                          </span>
                        </div>
                      </div>

                      {/* Stakeholders Section */}
                      {(deal.company || deal.user) && (
                        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between gap-5 ml-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {deal.company ? (
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700 transition-transform group-hover:scale-105">
                                  <BuildingOfficeIcon className="w-5 h-5 text-zinc-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[12px] font-black text-zinc-900 dark:text-zinc-100 truncate tracking-tight uppercase italic leading-none mb-0.5">{deal.company.name}</span>
                                   <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-widest italic">Corporate Asset</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-zinc-300">
                                <EllipsisHorizontalIcon className="w-5 h-5" />
                                <span className="text-[10px] font-black italic uppercase tracking-widest">Prospect</span>
                              </div>
                            )}
                          </div>
                          {deal.user && (
                            <div className="shrink-0">
                              <div className="relative">
                                {deal.user.image ? (
                                  <Image src={deal.user.image} alt={deal.user.name} width={40} height={40} className="w-10 h-10 rounded-2xl object-cover ring-[5px] ring-white dark:ring-zinc-900 shadow-xl group-hover:ring-indigo-100/50 transition-all duration-300" />
                                ) : (
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-[13px] ring-[5px] ring-white dark:ring-zinc-900 shadow-xl border border-indigo-400/30">
                                    {deal.user.name?.charAt(0) || '?'}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>

            {meta.hasMore && (
              <div className="py-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-100 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 transition-all disabled:opacity-50 italic group"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                      Loading Operations...
                    </div>
                  ) : (
                    <span className="group-hover:text-indigo-600 transition-colors">Expand Data Stream</span>
                  )}
                </button>
              </div>
            )}

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
            pipelineId={pipeline.id}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default PipelineBoard;
