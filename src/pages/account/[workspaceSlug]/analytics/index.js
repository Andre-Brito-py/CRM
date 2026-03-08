import { useRouter } from 'next/router';
import useSWR from 'swr';
import { AccountLayout } from '@/layouts/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import api from '@/lib/common/api';

const Analytics = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data, error } = useSWR(workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics` : null, api);

  if (error) return (
    <AccountLayout>
      <div className="p-10 text-center text-red-500">Failed to load analytics. Please try again later.</div>
    </AccountLayout>
  );

  if (!data) return (
    <AccountLayout>
      <div className="p-10 text-center text-gray-500 animate-pulse">Loading analytics...</div>
    </AccountLayout>
  );

  const { salesByUser, funnelData, salesTrend, taskCompletionData, sourceData, avgClosingTime } = data;

  const maxSales = Math.max(...salesTrend.map(d => d.amount)) || 1;

  const exportToCSV = () => {
    const csvRows = [];

    // Sales by User
    csvRows.push(['Sales by User']);
    csvRows.push(['User', 'Deals Won', 'Total Amount']);
    salesByUser.forEach(item => {
      csvRows.push([`"${item.user.name || 'Unassigned'}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Sales Trend
    csvRows.push(['Sales Trend']);
    csvRows.push(['Month', 'Amount']);
    salesTrend.forEach(item => {
      csvRows.push([`"${item.month}"`, item.amount]);
    });

    csvRows.push([]);

    // Pipeline Funnel
    csvRows.push(['Pipeline Funnel']);
    csvRows.push(['Stage', 'Count', 'Amount']);
    funnelData.forEach(item => {
      csvRows.push([`"${item.stage}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Task Completion
    csvRows.push(['Task Completion']);
    csvRows.push(['User', 'Total', 'Completed', 'Rate (%)']);
    taskCompletionData?.forEach(item => {
      csvRows.push([`"${item.user.name || 'Unassigned'}"`, item.total, item.completed, item.rate]);
    });

    csvRows.push([]);

    // Deals by Source
    csvRows.push(['Deals by Source']);
    csvRows.push(['Source', 'Count', 'Amount']);
    sourceData?.forEach(item => {
      csvRows.push([`"${item.source}"`, item.count, item.amount]);
    });

    csvRows.push([]);

    // Average Closing Time
    csvRows.push(['Average Closing Time']);
    csvRows.push(['Days']);
    csvRows.push([avgClosingTime || 0]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + csvRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_report_${workspaceSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AccountLayout>
      <Meta title={`Analytics - ${workspaceSlug}`} />
      <div className="flex justify-between items-end">
        <Content.Title title="Analytics" subtitle="Sales performance and insights" />
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium mb-2 shadow-sm"
        >
          Export Report
        </button>
      </div>
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales by User */}
          <Card>
            <Card.Body title="Sales by User (Won Deals)">
              <div className="space-y-4 mt-4">
                {salesByUser.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      {item.user.image ? (
                        <img src={item.user.image} alt={item.user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                          {item.user.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.user.name || 'Unassigned'}</p>
                        <p className="text-xs text-gray-500">{item.count} deals won</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600 text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </span>
                  </div>
                ))}
                {salesByUser.length === 0 && <p className="text-gray-500 text-sm italic">No sales data found.</p>}
              </div>
            </Card.Body>
          </Card>

          {/* Pipeline Funnel */}
          <Card>
            <Card.Body title="Pipeline Funnel (Deals by Stage)">
              <div className="space-y-4 mt-4">
                {funnelData.map((stage, idx) => {
                  const maxCount = Math.max(...funnelData.map(d => d.count)) || 1;
                  const percentage = (stage.count / maxCount) * 100;

                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{stage.stage}</span>
                        <span className="text-gray-600">{stage.count} deals ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stage.amount)})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {funnelData.length === 0 && <p className="text-gray-500 text-sm italic">No pipeline data found.</p>}
              </div>
            </Card.Body>
          </Card>

          {/* Task Completion by User */}
          <Card>
            <Card.Body title="Task Completion by User">
              <div className="space-y-4 mt-4">
                {taskCompletionData?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {item.user.image ? (
                          <img src={item.user.image} alt={item.user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                            {item.user.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.user.name || 'Unassigned'}</p>
                        <p className="text-xs text-gray-500">{item.completed}/{item.total} tasks completed</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${item.rate >= 80 ? 'bg-green-500' : item.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.rate}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-700 text-xs w-8 text-right">{item.rate}%</span>
                    </div>
                  </div>
                ))}
                {(!taskCompletionData || taskCompletionData.length === 0) && <p className="text-gray-500 text-sm italic">No task data found.</p>}
              </div>
            </Card.Body>
          </Card>

          {/* Deals by Source */}
          <Card>
            <Card.Body title="Deals by Source">
              <div className="space-y-4 mt-4">
                {sourceData?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                        {item.source.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.source}</p>
                        <p className="text-xs text-gray-500">{item.count} deals</p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </span>
                  </div>
                ))}
                {(!sourceData || sourceData.length === 0) && <p className="text-gray-500 text-sm italic">No source data found.</p>}
              </div>
            </Card.Body>
          </Card>

          {/* Average Closing Time */}
          <Card>
            <Card.Body title="Average Closing Time">
              <div className="flex flex-col items-center justify-center h-full py-6">
                <span className="text-5xl font-bold text-blue-600">{avgClosingTime || 0}</span>
                <span className="text-gray-500 text-lg mt-2">Days</span>
                <p className="text-sm text-gray-400 mt-4 text-center">
                  Average time from creation to closed won
                </p>
              </div>
            </Card.Body>
          </Card>

          {/* Sales Trend */}
          <Card className="col-span-1 md:col-span-2">
            <Card.Body title="Sales Trend (Last 12 Months)">
              <div className="mt-8 flex items-end space-x-6 overflow-x-auto h-64 pb-8 px-2">
                {salesTrend.map((item, idx) => {
                  const heightPercentage = maxSales > 0 ? (item.amount / maxSales) * 100 : 0;

                  return (
                    <div key={idx} className="flex flex-col items-center group relative min-w-[60px]">
                      <div className="relative w-full flex justify-center items-end h-48">
                        <div
                          className="w-12 bg-blue-500 rounded-t-md hover:bg-blue-600 transition-all duration-300 relative group-hover:shadow-lg"
                          style={{ height: `${Math.max(2, heightPercentage)}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none transition-opacity whitespace-nowrap z-10">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      <span className="mt-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
              {salesTrend.length === 0 && <p className="text-gray-500 text-sm italic mt-4">No trend data available.</p>}
            </Card.Body>
          </Card>
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default Analytics;
