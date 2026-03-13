import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSWRConfig } from 'swr';
import api from '@/lib/common/api';

const BoardColumn = ({ stage, deals, workspaceSlug }) => {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-shrink-0 w-[320px] bg-zinc-50/50 rounded-[32px] p-3 mr-6 border border-zinc-100/50 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4 px-3 pt-2">
        <h3 className="font-executive font-bold text-zinc-900 tracking-tight">{stage.name}</h3>
        <span className="bg-zinc-200/50 text-zinc-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-200/50 uppercase tracking-wider">
          {deals.length}
        </span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 overflow-y-auto min-h-[500px] rounded-3xl p-1 transition-all duration-300 custom-scrollbar ${snapshot.isDraggingOver ? 'bg-indigo-50/30 ring-2 ring-indigo-500/10' : ''
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
                    className={`bg-white p-5 mb-4 rounded-2xl shadow-premium-sm border border-zinc-100 hover:shadow-premium hover:border-zinc-200 transition-all duration-300 cursor-pointer group ${snapshot.isDragging ? 'rotate-2 ring-4 ring-indigo-500/20 shadow-2xl z-50 scale-105' : ''
                      }`}
                    style={provided.draggableProps.style}
                  >
                    <div className="font-executive font-bold text-zinc-900 text-[15px] mb-2 truncate group-hover:text-indigo-600 transition-colors">{deal.name}</div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm font-bold text-zinc-900">
                        {deal.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.amount) : '—'}
                      </span>
                      {deal.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${deal.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100/50' :
                          deal.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100/50' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                          }`}>
                          {deal.priority}
                        </span>
                      )}
                    </div>
                    {(deal.company || deal.user) && (
                      <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between text-[11px] font-medium text-zinc-400">
                        <span className="truncate max-w-[70%] flex items-center gap-1.5 uppercase tracking-tighter">
                          {deal.company && (
                            <>
                              <span className="text-zinc-300">🏢</span>
                              <span className="truncate">{deal.company.name}</span>
                            </>
                          )}
                        </span>
                        {deal.user && (
                          <div className="flex items-center" title={deal.user.name}>
                            {deal.user.image ? (
                              <img src={deal.user.image} alt={deal.user.name} className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold text-[10px] ring-2 ring-white shadow-sm border border-indigo-100/50">
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

const PipelineBoard = ({ pipeline, workspaceSlug }) => {
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

    // Optimistic UI Update Logic
    const newStages = [...stages];
    const sourceStageIndex = newStages.findIndex(s => s.id === source.droppableId);
    const destStageIndex = newStages.findIndex(s => s.id === destination.droppableId);

    const sourceStage = newStages[sourceStageIndex];
    const destStage = newStages[destStageIndex];

    // Remove from source
    const [movedDeal] = sourceStage.deals.splice(source.index, 1);

    // Add to destination
    destStage.deals.splice(destination.index, 0, movedDeal);

    setStages(newStages); // Update local state immediately

    try {
      await api(`/api/workspace/${workspaceSlug}/deals`, {
        method: 'PUT',
        body: {
          id: draggableId,
          stageId: destination.droppableId,
        }
      });

      // Revalidate to ensure consistency with backend
      mutate(`/api/workspace/${workspaceSlug}/pipelines`);

    } catch (error) {
      console.error('Failed to move deal', error);
      // Revert local state if API fails (could refetch or undo)
      mutate(`/api/workspace/${workspaceSlug}/pipelines`);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div id="pipeline-board" className="flex h-full overflow-x-auto pb-8 items-start custom-scrollbar">
        {stages.map((stage) => (
          <BoardColumn
            key={stage.id}
            stage={stage}
            deals={stage.deals || []}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default PipelineBoard;
