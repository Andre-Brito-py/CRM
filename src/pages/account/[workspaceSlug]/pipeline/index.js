import { useState } from 'react';
import { PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import usePipelines from '@/hooks/data/usePipelines';
import { useWorkspace } from '@/providers/workspace';
import PipelineBoard from '@/sections/pipeline/Board';
import AddDealModal from '@/sections/pipeline/AddDealModal';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';

const Pipeline = () => {
  const { workspace } = useWorkspace();
  const { data, isLoading } = usePipelines(workspace?.slug);
  const [isModalOpen, setModalOpen] = useState(false);

  // AI Insights
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // For MVP we only use the first pipeline
  const pipeline = data?.pipelines?.[0];

  const toggleModal = () => setModalOpen(!isModalOpen);

  const generateInsights = async () => {
    if (!pipeline) return;
    setIsGeneratingInsights(true);
    try {
      const response = await api(`/api/workspace/${workspace?.slug}/pipelines/${pipeline.id}/insights`, {
        method: 'POST',
      });
      if (response.data?.insights) {
        setAiInsights(response.data.insights);
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
      <Meta title={`Nextacular - ${workspace?.name} | Pipeline`} />
      <Content.Title
        title="Pipeline"
        subtitle="Manage your sales funnel"
      />
      <Content.Divider />
      <div className="flex-1 flex flex-col h-full overflow-hidden px-5 py-5 md:px-10">
        <div className="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
            <h2 className="text-lg font-medium text-gray-900 mr-4">
              {pipeline?.name || 'Sales Pipeline'}
            </h2>
            {pipeline && (
              <button
                onClick={generateInsights}
                disabled={isGeneratingInsights}
                className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isGeneratingInsights ? (
                  <span className="animate-pulse">Analyzing...</span>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4 mr-1.5" />
                    Get AI Insights
                  </>
                )}
              </button>
            )}
          </div>
          <button
            className="flex items-center justify-center px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-500"
            onClick={toggleModal}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Deal
          </button>
        </div>

        {aiInsights && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100 relative shadow-sm">
            <button
              onClick={() => setAiInsights(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="flex items-start">
              <SparklesIcon className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-purple-900 mb-1">Pipeline Insights</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiInsights}</p>
              </div>
            </div>
          </div>
        )}

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
