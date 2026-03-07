import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSWRConfig } from 'swr';
import api from '@/lib/common/api';

const BoardColumn = ({ stage, deals, workspaceSlug }) => {
  return (
    <div className="flex flex-col flex-shrink-0 w-72 bg-gray-100 rounded-lg p-2 mr-4">
      <div className="flex items-center justify-between mb-2 p-1">
        <h3 className="font-semibold text-gray-700">{stage.name}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
          {deals.length}
        </span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 overflow-y-auto min-h-[200px] rounded transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
              }`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white p-3 mb-2 rounded shadow-sm border border-gray-200 hover:shadow-md transition-all ${snapshot.isDragging ? 'rotate-2 ring-2 ring-blue-400 z-50' : ''
                      }`}
                    style={provided.draggableProps.style}
                  >
                    <div className="font-medium text-gray-800 mb-1 truncate">{deal.name}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {deal.amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(deal.amount) : '-'}
                      </span>
                      {deal.priority && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${deal.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                            deal.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                          }`}>
                          {deal.priority}
                        </span>
                      )}
                    </div>
                    {deal.company && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center text-xs text-gray-500">
                        <span className="truncate max-w-full">🏢 {deal.company.name}</span>
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
      <div className="flex h-full overflow-x-auto pb-4 items-start">
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
