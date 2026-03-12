import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';

const Responses = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [classification, setClassification] = useState('');
  const [surveyId, setSurveyId] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (classification) params.set('classification', classification);
    if (surveyId) params.set('surveyId', surveyId);
    return params.toString();
  }, [from, to, classification, surveyId]);

  const { data: surveysData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/surveys` : null,
    fetcher
  );
  const { data: responsesData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/responses${query ? `?${query}` : ''}` : null,
    fetcher
  );

  const surveys = surveysData?.data?.surveys || [];
  const responses = responsesData?.data?.responses || [];

  return (
    <AccountLayout>
      <Meta title="Customer Satisfaction - Responses" />
      <Content.Title title="Customer Satisfaction" subtitle="Responses" className="font-executive" />
      <Content.Divider />

      <Card>
        <Card.Body title="Respostas NPS" subtitle="Filtre por período e classificação.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">De</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Até</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Classificação</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="promoter">promoter</option>
                <option value="passive">passive</option>
                <option value="detractor">detractor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pesquisa</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
              >
                <option value="">Todas</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {responses.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhuma resposta encontrada.</div>
          ) : (
            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pesquisa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classificação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.survey?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.contact?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{r.score}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.classification}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[420px]">
                        <div className="truncate">{r.feedbackText || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </AccountLayout>
  );
};

export default Responses;
