import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';

import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import api from '@/lib/common/api';
import fetcher from '@/lib/client/fetcher';

const NpsSurveys = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSending, setSending] = useState(false);
  const [createdName, setCreatedName] = useState('');
  const [createdTrigger, setCreatedTrigger] = useState('manual');

  const [sendSurveyId, setSendSurveyId] = useState('');
  const [sendContactId, setSendContactId] = useState('');
  const [sendChannel, setSendChannel] = useState('link');
  const [sendIntegrationId, setSendIntegrationId] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const { data: surveysData, mutate: mutateSurveys } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/nps/surveys` : null,
    fetcher
  );
  const { data: contactsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/contacts` : null,
    fetcher
  );
  const { data: integrationsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/whatsapp` : null,
    fetcher
  );

  const surveys = surveysData?.data?.surveys || [];
  const contacts = contactsData?.data?.contacts || [];
  const integrations = integrationsData?.data?.integrations || [];

  const canCreate = useMemo(() => createdName.trim().length > 0, [createdName]);
  const canSend = useMemo(() => {
    if (!sendSurveyId || !sendContactId) return false;
    if (sendChannel === 'whatsapp') return Boolean(sendIntegrationId);
    return true;
  }, [sendSurveyId, sendContactId, sendChannel, sendIntegrationId]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!canCreate) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/nps/surveys`, {
        method: 'POST',
        body: {
          name: createdName.trim(),
          trigger_type: createdTrigger,
        },
      });
      toast.success('Pesquisa criada');
      setCreateOpen(false);
      setCreatedName('');
      setCreatedTrigger('manual');
      mutateSurveys();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao criar pesquisa');
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    setSending(true);
    setGeneratedLink('');
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/nps/send`, {
        method: 'POST',
        body: {
          surveyId: sendSurveyId,
          contactId: sendContactId,
          channel: sendChannel,
          integrationId: sendChannel === 'whatsapp' ? sendIntegrationId : undefined,
          message: sendMessage || undefined,
          subject: sendChannel === 'email' ? sendSubject || undefined : undefined,
        },
      });
      const link = response?.data?.link || '';
      setGeneratedLink(link);
      if (sendChannel === 'link') {
        toast.success('Link gerado');
      } else {
        toast.success('Pesquisa enviada');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success('Link copiado');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <AccountLayout>
      <Meta title="Customer Satisfaction - NPS Surveys" />
      <Content.Title title="Customer Satisfaction" subtitle="NPS Surveys" className="font-executive" />
      <Content.Divider />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <Card.Body title="Pesquisas" subtitle="Crie e gerencie suas pesquisas NPS.">
              <div className="flex justify-end">
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Criar pesquisa
                </button>
              </div>
              {surveys.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma pesquisa criada.</div>
              ) : (
                <div className="divide-y">
                  {surveys.map((s) => (
                    <div key={s.id} className="py-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">Trigger: {s.triggerType}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSendSurveyId(s.id);
                          toast.success('Pesquisa selecionada para envio');
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <Card.Body title="Enviar" subtitle="WhatsApp, Email ou Link.">
              <form onSubmit={onSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pesquisa</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                    value={sendSurveyId}
                    onChange={(e) => setSendSurveyId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {surveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contato</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                    value={sendContactId}
                    onChange={(e) => setSendContactId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Canal</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                    value={sendChannel}
                    onChange={(e) => setSendChannel(e.target.value)}
                  >
                    <option value="link">Link</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {sendChannel === 'whatsapp' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
                      value={sendIntegrationId}
                      onChange={(e) => setSendIntegrationId(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {integrations.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {sendChannel === 'email' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assunto</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                      value={sendSubject}
                      onChange={(e) => setSendSubject(e.target.value)}
                      placeholder="Pesquisa NPS"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mensagem (opcional)</label>
                  <textarea
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="Adicione um contexto antes da pergunta..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSend || isSending}
                  className={[
                    'w-full px-4 py-2 rounded-md text-sm font-medium',
                    canSend && !isSending ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed',
                  ].join(' ')}
                >
                  {isSending ? 'Enviando...' : sendChannel === 'link' ? 'Gerar link' : 'Enviar'}
                </button>

                {generatedLink ? (
                  <div className="pt-2">
                    <div className="text-xs text-gray-500 mb-2">Link</div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={generatedLink}
                        className="flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={copyLink}
                        className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-black"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                ) : null}
              </form>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Modal show={isCreateOpen} toggle={() => setCreateOpen(false)} title="Criar pesquisa NPS">
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
              value={createdName}
              onChange={(e) => setCreatedName(e.target.value)}
              placeholder="Ex: Pós-venda"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Trigger</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white"
              value={createdTrigger}
              onChange={(e) => setCreatedTrigger(e.target.value)}
            >
              <option value="manual">manual</option>
              <option value="deal_closed">deal_closed</option>
              <option value="scheduled">scheduled</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-md border text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canCreate}
              className={[
                'px-4 py-2 rounded-md text-sm font-medium',
                canCreate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed',
              ].join(' ')}
            >
              Criar
            </button>
          </div>
        </form>
      </Modal>
    </AccountLayout>
  );
};

export default NpsSurveys;
