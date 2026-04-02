import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useInvitations, useWorkspaces } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { redirectToCheckout } from '@/lib/client/stripe';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";

const Welcome = () => {
  const router = useRouter();
  const { data: invitationsData, isLoading: isFetchingInvitations } =
    useInvitations();
  const { data: workspacesData, isLoading: isFetchingWorkspaces } =
    useWorkspaces();
  const { setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);

  useEffect(() => {
    const pendingPriceId = localStorage.getItem('vysify_oauth_pending_price_id');
    if (pendingPriceId) {
      localStorage.removeItem('vysify_oauth_pending_price_id');
      document.cookie = 'vysify_skip_setup=; Max-Age=0; path=/;';
      
      const doSubscribe = async () => {
        setSubmittingState(true);
        toast.loading(t('common.loading.checkout', 'Redirecionando para pagamento seguro...'), { duration: 5000, id: 'checkout-loading' });
        try {
          const response = await api(`/api/payments/subscription/${pendingPriceId}`, {
            method: 'POST',
          });
          if (response?.data?.sessionId) {
            await redirectToCheckout(response.data.sessionId);
          } else {
            toast.dismiss('checkout-loading');
            toast.error('Não foi possível iniciar o checkout');
            setSubmittingState(false);
          }
        } catch (e) {
          toast.dismiss('checkout-loading');
          toast.error('Erro ao iniciar assinatura');
          setSubmittingState(false);
        }
      };
      
      doSubscribe();
    }
  }, [t]);

  const accept = (memberId) => {
    setSubmittingState(true);
    api(`/api/workspace/team/accept`, {
      body: { memberId },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Accepted invitation!');
      }
    });
  };

  const decline = (memberId) => {
    setSubmittingState(true);
    api(`/api/workspace/team/decline`, {
      body: { memberId },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Declined invitation!');
      }
    });
  };

  const navigate = (workspace) => {
    setWorkspace(workspace);
    router.replace(`/account/${workspace.slug}`);
  };

  return (
    <AccountLayout>
      <Meta title="Vysify - Dashboard" />
      <div className="flex flex-col gap-10">
        <section>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white font-executive tracking-tight">
              {t('workspace.dashboard.header.title')}
            </h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              {t("workspace.dashboard.header.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isFetchingWorkspaces ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-pulse" />
              ))
            ) : workspacesData?.workspaces.length > 0 ? (
              workspacesData.workspaces.map((workspace, index) => (
                <div
                  key={index}
                  className="group premium-card p-8 flex flex-col justify-between min-h-[200px] border-zinc-200/80 hover:scale-[1.01] transition-all cursor-pointer shadow-premium"
                  onClick={() => navigate(workspace)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl font-executive">
                        {workspace.name.charAt(0)}
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Workspace</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-executive">{workspace.name}</h3>
                  </div>

                  <div className="mt-6 flex items-center text-indigo-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                    {t('workspace.action.label.select') || "Open Workspace"}
                    <ChevronRightIcon className="w-4 h-4 ml-2" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                <p className="text-lg font-medium">{t('workspace.message.createworkspace')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="pt-10 border-t border-zinc-200">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white font-executive tracking-tight">
              {t("workspace.dashboard.header.invitations.title")}
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              {t("workspace.dashboard.header.invitations.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isFetchingInvitations ? (
              <div className="h-48 bg-white border border-zinc-200 rounded-3xl animate-pulse" />
            ) : invitationsData?.invitations.length > 0 ? (
              invitationsData.invitations.map((invitation, index) => (
                <div key={index} className="premium-card p-8 border-zinc-200/80">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <PlusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white">{invitation.workspace.name}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending Invitation</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                    You have been invited by <span className="font-semibold text-zinc-900 dark:text-white">{invitation.invitedBy.name || invitation.invitedBy.email}</span>
                  </p>

                  <div className="flex items-center gap-3">
                    <Button
                      className="flex-1 py-3 text-white premium-gradient rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                      disabled={isSubmitting}
                      onClick={() => accept(invitation.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      className="flex-1 py-3 text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      disabled={isSubmitting}
                      onClick={() => decline(invitation.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-[32px] flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 font-medium">
                {t("workspace.team.invitations.empty.message")}
              </div>
            )}
          </div>
        </section>
      </div>
    </AccountLayout>
  );
};

export default Welcome;
