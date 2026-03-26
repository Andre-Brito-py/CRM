import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import fetcher from '@/lib/client/fetcher';
import Meta from '@/components/Meta/index';

const WhatsAppSimulatePage = () => {
  const { data: session } = useSession();
  const { data: workspacesData } = useSWR(session ? '/api/admin/workspaces' : null, fetcher);

  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [phone, setPhone] = useState('5511999999999');
  const [name, setName] = useState('Teste Simulação');
  const [message, setMessage] = useState('Olá, esta é uma mensagem de teste para o inbox!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workspaces = workspacesData?.data?.workspaces || [];

  const handleSimulate = async () => {
    if (!workspaceSlug) {
      toast.error('Selecione um workspace');
      return;
    }
    if (!phone || !message) {
      toast.error('Telefone e mensagem são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/admin/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug,
          from: phone.replace(/\D/g, ''),
          name,
          body: message
        })
      });

      const result = await resp.json();
      if (resp.ok) {
        toast.success('Mensagem simulada com sucesso!');
        setMessage('');
      } else {
        toast.error(result?.error?.msg || 'Falha ao simular mensagem');
      }
    } catch (error) {
      toast.error('Erro de rede ao simular mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Meta title="WhatsApp - Simulador" />
      <Content.Title 
        title="Simulador de WhatsApp" 
        subtitle="Teste o recebimento de mensagens no Inbox sem custos" 
        className="font-executive" 
      />
      <Content.Divider />

      <Content.Container>
        <div className="max-w-2xl mx-auto">
          <Card>
            <Card.Body title="Nova Simulação" subtitle="A mensagem aparecerá no Inbox do workspace selecionado">
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Workspace Destino</label>
                  <select
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Selecione um workspace...</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.slug}>
                        {w.name} ({w.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone do Remetente</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: 5511999999999"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome do Remetente</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mensagem (Texto)</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Digite o conteúdo da mensagem..."
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSimulate}
                    className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      'Enviando...'
                    ) : (
                      <>
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        Simular Recebimento
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card.Body>
          </Card>

          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3">
             <div className="text-blue-600 font-bold">ℹ️</div>
             <div className="text-sm text-blue-800">
               Esta ferramenta simula o comportamento exato do Webhook oficial. 
               Se o **Autopilot** estiver ativado para o workspace, ele processará esta mensagem 
               e gerará uma resposta automática (usando o Gemini 1.5 Flash configurado).
             </div>
          </div>
        </div>
      </Content.Container>
    </AdminLayout>
  );
};

export default WhatsAppSimulatePage;
