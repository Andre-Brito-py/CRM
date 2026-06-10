import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import fetcher from '@/lib/client/fetcher';

const Responses = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [classification, setClassification] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [selectedResponse, setSelectedResponse] = useState(null);

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
      <Meta title={`${t('common.label.customerSatisfaction')} - ${t('nps.responses.filterTitle')}`} />
      <Content.Title title={t('common.label.customerSatisfaction')} subtitle={t('nps.responses.filterTitle')} className="font-executive" />
      <Content.Divider />

      <Card>
        <Card.Body title={t('nps.responses.filterTitle')} subtitle={t('nps.responses.filterSubtitle')}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('nps.responses.from')}</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('nps.responses.to')}</label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('nps.responses.classification')}</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                <option value="">{t('nps.responses.all')}</option>
                <option value="promoter">promoter</option>
                <option value="passive">passive</option>
                <option value="detractor">detractor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('nps.responses.survey')}</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
              >
                <option value="">{t('nps.responses.all')}</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {responses.length === 0 ? (
            <div className="text-sm text-gray-500">{t('nps.responses.none')}</div>
          ) : (
            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.survey')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.contact')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.score')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.classification')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nps.responses.table.feedback')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((r) => (
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedResponse(r)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.survey?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.contact?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{r.score}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className={[
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide',
                          r.classification === 'promoter' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          r.classification === 'passive' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        ].join(' ')}>
                          {r.classification}
                        </span>
                      </td>
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

      <Modal
        show={selectedResponse !== null}
        toggle={() => setSelectedResponse(null)}
        title={t('nps.responses.modal.title')}
      >
        {selectedResponse && (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('nps.responses.table.survey')}</span>
                <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{selectedResponse.survey?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('nps.responses.table.contact')}</span>
                <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{selectedResponse.contact?.name || '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('nps.responses.table.date')}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {new Date(selectedResponse.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('nps.responses.table.score')}</span>
                  <span className="inline-flex items-center justify-center text-xl font-black text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 rounded-full w-10 h-10 mt-1">
                    {selectedResponse.score}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('nps.responses.table.classification')}</span>
                  <span className={[
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mt-2.5',
                    selectedResponse.classification === 'promoter' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    selectedResponse.classification === 'passive' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                  ].join(' ')}>
                    {selectedResponse.classification}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {t('nps.responses.modal.fullFeedback')}
              </span>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-150 dark:border-zinc-800">
                <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed italic">
                  &ldquo;{selectedResponse.feedbackText || '-'}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-sm transition-all text-zinc-700 dark:text-zinc-300"
              >
                {t('nps.responses.modal.close')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AccountLayout>
  );
};

export default Responses;
