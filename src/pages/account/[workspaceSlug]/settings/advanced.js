import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getServerSession } from 'next-auth/next';
import { getWorkspace, isWorkspaceCreator, isWorkspaceOwner } from '@/prisma/services/workspace';
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { authOptions } from '@/lib/server/auth';

const Advanced = ({ isCreator, workspace }) => {
  const { setWorkspace, workspace: workspaceFromContext } = useWorkspace();
  const { t } = useTranslation();
  const router = useRouter();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [showModal, setModalState] = useState(false);
  const [verifyWorkspace, setVerifyWorkspace] = useState('');
  const currentWorkspace = workspaceFromContext || workspace;
  const verifiedWorkspace = verifyWorkspace === currentWorkspace?.slug;

  useEffect(() => {
    if (workspace) setWorkspace(workspace);
  }, [setWorkspace, workspace]);

  const handleVerifyWorkspaceChange = (event) =>
    setVerifyWorkspace(event.target.value);

  const deleteWorkspace = () => {
    if (!currentWorkspace?.slug) {
      toast.error('Workspace not found');
      return;
    }
    setSubmittingState(true);
    api(`/api/workspace/${currentWorkspace.slug}`, {
      method: 'DELETE',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toggleModal();
        setWorkspace(null);
        router.replace('/account');
        toast.success('Workspace has been deleted!');
      }
    });
  };

  const handleExportData = () => {
    if (!currentWorkspace?.slug) return;
    toast.success('Preparando dados para exportação. O download iniciará em breve.', { duration: 4000 });
    window.location.href = `/api/workspace/${currentWorkspace.slug}/export`;
  };

  const toggleModal = () => {
    setVerifyWorkspace('');
    setModalState(!showModal);
  };

  return (
    <AccountLayout>
      <Meta title={`Closify - ${currentWorkspace?.name} | Advanced Settings`} />
      <Content.Title
        title={t("settings.workspace.advanced")}
        subtitle={t("settings.workspace.manage.label")}
      />
      <Content.Divider />
      <Content.Container>
        <Card className="mb-8 border-gray-200 dark:border-zinc-700">
          <Card.Body
            title="Exportar Dados (LGPD/GDPR)"
            subtitle="Baixe uma cópia completa de todos os dados gerados neste Workspace em formato JSON estruturado."
          />
          <Card.Footer className="bg-gray-50 dark:bg-zinc-800/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <small className="text-gray-500 max-w-xl leading-relaxed">
              O arquivo conterá todos os Leads, Negócios (Deals), Tarefas, e configurações de funil. Pode levar alguns segundos para compilar os dados. Mantenha os dados baixados de seus clientes seguros.
            </small>
            <Button
              className="text-white bg-brand-600 hover:bg-brand-700 flex items-center gap-2 whitespace-nowrap"
              onClick={handleExportData}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Exportar Dados (JSON)</span>
            </Button>
          </Card.Footer>
        </Card>

        <Card danger>
          <Card.Body
            title={t("settings.workspace.delete")}
            subtitle={t("settings.workspace.delete.message")}
          />
          <Card.Footer>
            <small className={isCreator ? 'text-red-600' : ''}>
              {isCreator
                ? t("setting.workspace.delete.warning.message")
                : t("settings.workspace.delete.contact.message")}
            </small>
            {isCreator && (
              <Button
                className="text-white bg-red-600 hover:bg-red-500"
                disabled={isSubmitting}
                onClick={toggleModal}
              >
                {isSubmitting ? 'Deleting' : 'Delete'}
              </Button>
            )}
          </Card.Footer>
          <Modal
            show={showModal}
            title="Deactivate Workspace"
            toggle={toggleModal}
          >
            <p className="flex flex-col">
              <span>
                {t("settings.workspace.delete.data.warning")}
              </span>
              <span>
                Data associated with this workspace can&apos;t be accessed by
                team members.
              </span>
            </p>
            <p className="px-3 py-2 text-red-600 border border-red-600 rounded">
              <strong>Warning:</strong> {t("settings.workspace.delete.final.message")}
            </p>
            <div className="flex flex-col">
              <label className="text-sm text-gray-400">
                Enter <strong>{currentWorkspace?.slug}</strong> to continue:
              </label>
              <input
                className="px-3 py-2 border rounded"
                disabled={isSubmitting}
                onChange={handleVerifyWorkspaceChange}
                type="email"
                value={verifyWorkspace}
              />
            </div>
            <div className="flex flex-col items-stretch">
              <Button
                className="text-white bg-red-600 hover:bg-red-500"
                disabled={!verifiedWorkspace || isSubmitting}
                onClick={deleteWorkspace}
              >
                <span>{t("settings.workspace.delete")}</span>
              </Button>
            </div>
          </Modal>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  let isOwner = false;
  let isCreator = false;
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );
    if (workspace) {
      isOwner = isWorkspaceOwner(session.user.email, workspace);
      isCreator = isWorkspaceCreator(session.user.userId, workspace.creatorId);
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

  if (!isOwner) {
    return {
      redirect: {
        destination: `/account/${workspace.slug}`,
        permanent: false,
      },
    };
  }

  return { props: { isCreator, workspace } };
};

export default Advanced;
