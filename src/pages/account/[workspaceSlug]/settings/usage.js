import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { 
  ChatBubbleLeftRightIcon, 
  SparklesIcon, 
  BoltIcon 
} from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import fetcher from '@/lib/client/fetcher';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import FeatureGuard from '@/components/Maintenance/FeatureGuard';

const ProgressBar = ({ current, max, colorClass }) => {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-bold mb-2">
        <span className="text-zinc-500 uppercase tracking-widest">Consumption</span>
        <span className="text-zinc-800 dark:text-zinc-200">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-medium text-zinc-500 mt-2">
        <span>{current.toLocaleString('pt-BR')} used</span>
        {max > 0 ? <span>{max.toLocaleString('pt-BR')} limit</span> : <span>Unlimited</span>}
      </div>
    </div>
  );
};

const UsageAndAddons = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { workspaceSlug } = router.query;
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    setWorkspace(workspace);
  }, [setWorkspace, workspace]);

  useEffect(() => {
    if (router.query.status === 'addon_success') {
      toast.success('Pacote extra adicionado com sucesso!');
      router.replace(`/account/${workspaceSlug}/settings/usage`, undefined, { shallow: true });
    }
    if (router.query.status === 'addon_cancelled') {
      toast.error('Compra cancelada pelo usuário.');
      router.replace(`/account/${workspaceSlug}/settings/usage`, undefined, { shallow: true });
    }
  }, [router, workspaceSlug]);

  const { data, isLoading, error } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/usage-status` : null,
    fetcher
  );

  const usageData = data?.data;

  const buyAddon = async (addonType) => {
    if (!isTeamOwner) return;
    setIsBuying(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/billing/addon-checkout`, {
        method: 'POST',
        body: { addonType }
      });

      if (response?.error) {
        toast.error(response.error.msg || 'Falha ao iniciar compra');
        setIsBuying(false);
        return;
      }

      if (response?.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      toast.error('Ocorreu um erro ao conectar com o provedor de pagamentos.');
      setIsBuying(false);
    }
  };

  return (
    <AccountLayout>
      <Meta title={`Vysify - ${workspace.name} | Uso e Franquia`} />
      <Content.Title
        title="Uso e Franquia"
        subtitle="Monitore o limite do seu plano e gerencie recargas extras"
        className="font-executive"
      />
      <Content.Divider />
      
      <Content.Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* AI CARD */}
          <div className="relative group lg:col-span-2 max-w-2xl mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl" />
            <div className="relative bg-white dark:bg-zinc-900 border border-violet-100 dark:border-violet-900/30 rounded-3xl shadow-xl shadow-violet-900/5 p-8 overflow-hidden pointer-events-none opacity-50 cursor-not-allowed">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <SparklesIcon className="w-48 h-48 text-violet-900" />
              </div>
              
              <div className="relative z-10">
                <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full">
                  Em Breve
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                    <SparklesIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-executive">Vysify AI</h2>
                    <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Tokens e Capacidade Neural</p>
                  </div>
                </div>

                <>
                  <ProgressBar 
                    current={0} 
                    max={0} 
                    colorClass="bg-gradient-to-r from-violet-400 to-fuchsia-500"
                  />

                  <div className="mt-8 pt-8 border-t border-violet-50 dark:border-violet-900/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Saldo Extra Neural</span>
                      <span className="px-3 py-1 bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 rounded-full text-xs font-bold tracking-wider">
                        NÃO EXPIRA
                      </span>
                    </div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-fuchsia-800 dark:from-violet-400 dark:to-fuchsia-200 font-executive">
                      {(usageData?.workspace?.extraAiTokens || 0).toLocaleString('pt-BR')} <span className="text-lg font-bold text-violet-500">tokens</span>
                    </div>
                    <p className="text-xs font-medium text-zinc-500 mt-2 leading-relaxed">
                      Este saldo entra em ação quando o cérebro AI excede a capacidade mensal da sua assinatura principal.
                    </p>
                  </div>

                  {usageData?.addons?.ai?.enabled && (
                    <button
                      disabled={true} // For now, disabled for UI effect
                      className="mt-8 w-full group/btn relative inline-flex items-center justify-center gap-2 px-8 py-4 overflow-hidden rounded-2xl bg-zinc-900 text-white font-bold text-sm tracking-wide transition-all disabled:opacity-50"
                    >
                      <SparklesIcon className="w-5 h-5 text-violet-400" />
                      <span>Adicionar {usageData.addons.ai.quantity.toLocaleString('pt-BR')} tokens</span>
                      <span className="px-2 py-0.5 ml-2 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-violet-400 text-xs font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usageData.addons.ai.price)}
                      </span>
                    </button>
                  )}
                </>
              </div>
            </div>
          </div>

        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const { getServerSession } = await import('next-auth/next');
  const { getAuthOptions } = await import('@/lib/server/auth');
  const options = await getAuthOptions();
  const session = await getServerSession(context.req, context.res, options);
  let isTeamOwner = false;
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );

    if (workspace) {
      isTeamOwner = isWorkspaceOwner(session.user.email, workspace);
    }
  }

  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  if (!workspace) {
    return { notFound: true };
  }

  if (!isTeamOwner) {
    return {
      redirect: {
        destination: `/account/${workspace.slug}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      isTeamOwner,
      workspace,
    },
  };
};

export default UsageAndAddons;
