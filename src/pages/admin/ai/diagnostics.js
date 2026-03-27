import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import Content from '@/components/Content/index';
import Card from '@/components/Card/index';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import { SparklesIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Diagnostics = () => {
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async (e) => {
    e?.preventDefault();
    if (!workspaceSlug.trim()) {
      toast.error('Ginfirme o slug do workspace');
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const res = await api(`/api/workspace/${workspaceSlug.trim()}/debug/ai`);
      if (res.data?.diagnostics) {
        setResults(res.data.diagnostics);
        toast.success('Diagnóstico concluído');
      } else {
        toast.error(res.error?.msg || 'Erro ao processar diagnóstico');
      }
    } catch (error) {
      toast.error('Erro na conexão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Content>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <SparklesIcon className="w-8 h-8 text-brand-600" />
              AI Diagnostics
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Ferramenta para depuração do ecossistema de IA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Analisar Workspace</h3>
              <form onSubmit={runDiagnostic} className="space-y-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Workspace Slug (ex: andre-workspace)"
                    className="w-full pl-9 pr-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !workspaceSlug.trim()}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-glow-brand/20 disabled:opacity-50"
                >
                  {isLoading ? 'Executando...' : 'Rodar Diagnóstico'}
                </button>
              </form>
            </Card>

            <Card className="p-6 bg-zinc-950 text-zinc-400 font-mono text-[10px] overflow-auto max-h-[400px]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 border-b border-zinc-900 pb-2">Console de Resposta</h3>
              <pre>{results ? JSON.stringify(results, null, 2) : '// Nenhum dado selecionado'}</pre>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!results ? (
              <div className="flex flex-col items-center justify-center h-[500px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] text-zinc-400">
                <SparklesIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold">Aguardando entrada de dados...</p>
                <p className="text-xs">Digite o slug de um workspace para ver o relatório completo.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 border-brand-200 bg-brand-50/10 active:scale-[0.99] transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-1">Status da Sessão Admin</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{results.session.email}</p>
                    <p className="text-xs font-bold text-brand-500 mt-1 uppercase">{results.session.role}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Workspace Identificado</p>
                    <p className="text-lg font-black text-emerald-600">{results.workspace.name}</p>
                    <p className="text-xs font-mono text-zinc-400 mt-1">{results.workspace.id}</p>
                  </Card>
                </div>

                <Card className="p-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">Checklist de Configuração</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800">
                      {results.ai.googleKeyPresent ? <CheckCircleIcon className="w-6 h-6 text-emerald-500 mt-1" /> : <XCircleIcon className="w-6 h-6 text-red-500 mt-1" />}
                      <div>
                        <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight text-sm">Google AI API Key</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{results.ai.googleKeyPresent ? 'Chave Gemini detectada e pronta para uso.' : 'AVISO: Nenhuma chave Gemini (GOOGLE_AI_API_KEY) encontrada no sistema.'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800">
                      {results.ai.moduleAllowed ? <CheckCircleIcon className="w-6 h-6 text-emerald-500 mt-1" /> : <XCircleIcon className="w-6 h-6 text-red-500 mt-1" />}
                      <div>
                        <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight text-sm">Permissão do Módulo (AI Assistant)</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{results.ai.moduleAllowed ? `O plano '${results.ai.plan}' tem acesso liberado.` : `O plano '${results.ai.plan}' NÃO tem permissão para usar IA.`}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800">
                      {results.integrations.count > 0 ? <CheckCircleIcon className="w-6 h-6 text-emerald-500 mt-1" /> : <XCircleIcon className="w-6 h-6 text-amber-500 mt-1" />}
                      <div>
                        <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight text-sm">Integrações de Chat</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{results.integrations.count > 0 ? `${results.integrations.count} integração(ões) detectada(s).` : 'AVISO: Nenhuma integração ativa encontrada para este workspace.'}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-8 bg-brand-600/5 border-brand-100">
                   <h3 className="text-xs font-black uppercase tracking-widest text-brand-600 mb-4">Limites de Uso (24h)</h3>
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Requisições</p>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{results.ai.limits.requests24h}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Tokens Máximos</p>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white">{results.ai.limits.tokens24h.toLocaleString()}</p>
                      </div>
                   </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Content>
    </AdminLayout>
  );
};

export default Diagnostics;
