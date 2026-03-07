import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import usePipelines from '@/hooks/data/usePipelines';
import { useWorkspace } from '@/providers/workspace';
import PipelineBoard from '@/sections/pipeline/Board';
import AddDealModal from '@/sections/pipeline/AddDealModal';

const Pipeline = () => {
  const { workspace } = useWorkspace();
  const { data, isLoading } = usePipelines(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  // For MVP we only use the first pipeline
  const pipeline = data?.pipelines?.[0];

  const toggleModal = () => setModalOpen(!isModalOpen);

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name} | Pipeline`} />
      <Content.Title
        title="Pipeline"
        subtitle="Manage your sales funnel"
      />
      <Content.Divider />
      <div className="flex-1 flex flex-col h-full overflow-hidden px-10 py-5">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
                <h2 className="text-lg font-medium text-gray-900 mr-4">
                    {pipeline?.name || 'Sales Pipeline'}
                </h2>
            </div>
          <button
            className="flex items-center px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Deal
          </button>
        </div>
        
        {isLoading ? (
            <p>Loading pipeline...</p>
        ) : pipeline ? (
            <PipelineBoard pipeline={pipeline} workspaceSlug={workspace?.slug} />
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
