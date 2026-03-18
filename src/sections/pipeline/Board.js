import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSWRConfig } from 'swr';
import api from '@/lib/common/api';

const BoardColumn = ({ stage, deals, workspaceSlug, dealAiInsights }) => {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-shrink-0 w-[340px] bg-zinc-50/50 backdrop-blur-xl rounded-[40px] p-4 mr-8 border border-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.02)] transition-all duration-500">
      <div className="flex items-center justify-between mb-6 px-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-brand-500 rounded-full shadow-[0_0_12px_rgba(20,184,166,0.4)]" />
          <h3 className="font-executive font-black text-zinc-900 tracking-tight text-lg">{stage.name}</h3>
        </div>
        <span className="bg-white text-zinc-500 text-[10px] font-black px-3 py-1.5 rounded-xl border border-zinc-100 shadow-sm uppercase tracking-widest">
          {deals.length} deals
        </span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 overflow-y-auto min-h-[600px] rounded-[32px] p-2 transition-all duration-300 custom-scrollbar ${
              snapshot.isDraggingOver ? 'bg-brand-50/30' : ''
            }`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => router.push(`/account/${workspaceSlug}/deals/${deal.id}`)}
                    className={`bg-white group p-6 mb-5 rounded-[28px] border transition-all duration-300 cursor-pointer ${
                      snapshot.isDragging 
                        ? 'shadow-2xl border-brand-500/30 ring-8 ring-brand-500/5 rotate-2 scale-105 z-50 bg-white/95 backdrop-blur-sm' 
                        : 'shadow-premium border-zinc-100 hover:border-zinc-200 hover:-translate-y-1 hover:shadow-2xl'
                    }`}
                    style={provided.draggableProps.style}
                  >
                    {dealAiInsights?.[deal.id] && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        <div className={`px-2.5 py-1 rounded-full border flex items-center gap-2 shadow-sm transition-all group-hover:shadow-md ${
                          dealAiInsights[deal.id].probability >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' :
                          dealAiInsights[deal.id].probability >= 40 ? 'bg-amber-50 text-amber-700 border-amber-100/50' :
                          'bg-rose-50 text-rose-700 border-rose-100/50'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full bg-current ${dealAiInsights[deal.id].probability >= 70 ? 'animate-pulse' : ''}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-current">{dealAiInsights[deal.id].probability}%</span>
                        </div>
                        {dealAiInsights[deal.id].urgency === 'high' && (
                          <div className="px-2.5 py-1 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-bounce-subtle">
                            🔥 Hot Deal
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="font-executive font-black text-zinc-900 text-[16px] mb-3 leading-tight group-hover:text-brand-600 transition-colors">
                      {deal.name}
                    </div>

                    <div className="flex justify-between items-end mt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-0.5">Value</span>
                        <span className="text-[15px] font-executive font-bold text-zinc-900 tabular-nums">
                          {deal.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.amount) : 'Contact for pricing'}
                        </span>
                      </div>
                      {deal.priority && (
                        <div className={`text-[9px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-widest ${
                          deal.priority === 'HIGH' ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/10' :
                          deal.priority === 'MEDIUM' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' :
                          'bg-white text-zinc-400 border-zinc-100'
                        }`}>
                          {deal.priority}
                        </div>
                      )}
                    </div>

                    {(deal.company || deal.user) && (
                      <div className="mt-5 pt-5 border-t border-zinc-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {deal.company ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center text-[10px]">🏢</div>
                              <span className="text-[11px] font-bold text-zinc-400 truncate tracking-tight">{deal.company.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-zinc-300 italic">No company linked</span>
                          )}
                        </div>
                        {deal.user && (
                          <div className="flex -space-x-2">
                            {deal.user.image ? (
                              <img src={deal.user.image} alt={deal.user.name} className="w-8 h-8 rounded-2xl object-cover ring-4 ring-white shadow-premium" />
                            ) : (
                              <div className="w-8 h-8 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-[11px] ring-4 ring-white shadow-premium border border-brand-100/50">
                                {deal.user.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
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
      <div id="pipeline-board" className="flex h-full overflow-x-auto pb-12 pt-4 px-4 items-start custom-scrollbar gap-2">
        {stages.map((stage) => (
          <BoardColumn
            key={stage.id}
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
