import { useEffect, useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isSlug from 'validator/lib/isSlug';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { useTranslation } from "react-i18next";

const General = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState(workspace.name || '');
  const [slug, setSlug] = useState(workspace.slug || '');
  const [aiContext, setAiContext] = useState(workspace.aiContext || '');
  const validName = name.length > 0 && name.length <= 16;
  const validSlug =
    slug.length > 0 &&
    slug.length <= 16 &&
    isSlug(slug) &&
    isAlphanumeric(slug, undefined, { ignore: '-' });

  const changeName = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/name`, {
      body: { name },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace name successfully updated!');
      }
    });
  };

  const changeSlug = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/slug`, {
      body: { slug },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);
      const slug = response?.data?.slug;

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace slug successfully updated!');
        router.replace(`/account/${slug}/settings/general`);
      }
    });
  };

  const changeAiContext = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/ai-context`, {
      body: { aiContext },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('AI Context successfully updated!');
      }
    });
  };

  const copyToClipboard = () => toast.success('Copied to clipboard!');

  const handleNameChange = (event) => setName(event.target.value);

  const handleSlugChange = (event) => setSlug(event.target.value);

  const handleAiContextChange = (event) => setAiContext(event.target.value);

  useEffect(() => {
    setName(workspace.name);
    setSlug(workspace.slug);
    setAiContext(workspace.aiContext || '');
    setWorkspace(workspace);
  }, [workspace, setWorkspace]);

  const settingsSteps = [
    {
      element: '#settings-general-content',
      popover: {
        title: t('onboarding.tour.settings.step1.title'),
        description: t('onboarding.tour.settings.step1.desc'),
        position: 'bottom',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="settings-tour" steps={settingsSteps} />
      <Meta title={`Closify - ${workspace.name} | Settings`} />
      <div id="settings-general-content">
        <Content.Title
          title={t("settings.workspace.information")}
          subtitle={t("settings.general.workspace.description")}
        />
        <Content.Divider />
        <Content.Container>
          <Card>
            <Card.Body
              title={t("workspace.action.name.label")}
              subtitle={t("settings.workspace.name.description")}
            >
              <input
                className="px-3 py-2 border rounded md:w-1/2"
                disabled={isSubmitting || !isTeamOwner}
                onChange={handleNameChange}
                type="text"
                value={name}
              />
            </Card.Body>
            <Card.Footer>
              <small>Please use 16 characters at maximum</small>
              {isTeamOwner && (
                <Button
                  className="text-white bg-blue-600 hover:bg-blue-500"
                  disabled={!validName || isSubmitting}
                  onClick={changeName}
                >
                  Save
                </Button>
              )}
            </Card.Footer>
          </Card>
          <Card>
            <Card.Body
              title={t("settings.workspace.slug")}
              subtitle={t("setting.workspace.slug.description")}
            >
              <div className="flex items-center space-x-3">
                <input
                  className="px-3 py-2 border rounded md:w-1/2"
                  disabled={isSubmitting || !isTeamOwner}
                  onChange={handleSlugChange}
                  type="text"
                  value={slug}
                />
                <span className={`text-sm ${slug.length > 16 && 'text-red-600'}`}>
                  {slug.length} / 16
                </span>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>
                {t("settings.workspace.slug.validation.message")}
              </small>
              {isTeamOwner && (
                <Button
                  className="text-white bg-blue-600 hover:bg-blue-500"
                  disabled={!validSlug || isSubmitting}
                  onClick={changeSlug}
                >
                  {t("common.label.save")}
                </Button>
              )}
            </Card.Footer>
          </Card>
          <Card>
            <Card.Body
              title={t("settings.workspace.slug.validation.message")}
              subtitle={t("settings.workspace.id.description")}
            >
              <div className="flex items-center justify-between px-3 py-2 space-x-5 font-mono text-sm border rounded md:w-1/2">
                <span className="overflow-x-auto">{workspace.workspaceCode}</span>
                <CopyToClipboard
                  onCopy={copyToClipboard}
                  text={workspace.workspaceCode}
                >
                  <DocumentDuplicateIcon className="w-5 h-5 cursor-pointer hover:text-blue-600" />
                </CopyToClipboard>
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body
              title="AI Business Context"
              subtitle="Describe your company, products, and sales style to help Closify AI suggest better replies and insights."
            >
              <textarea
                className="px-3 py-2 border rounded w-full h-32 resize-none text-sm"
                disabled={isSubmitting || !isTeamOwner}
                onChange={handleAiContextChange}
                placeholder="Ex: We are a high-end real estate agency focused on luxury apartments in São Paulo. Our sales style is professional yet friendly, focusing on the long-term investment value..."
                value={aiContext}
              />
            </Card.Body>
            <Card.Footer>
              <small>Maximum 5000 characters recommendation for best results.</small>
              {isTeamOwner && (
                <Button
                  className="text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                  disabled={isSubmitting}
                  onClick={changeAiContext}
                >
                  Update AI Context
                </Button>
              )}
            </Card.Footer>
          </Card>

          {/* Presets Card */}
          {isTeamOwner && (
            <Card>
              <Card.Body
                title="Industry Presets"
                subtitle="Apply a 1-click setup to your workspace to automatically configure pipelines, custom fields, and tags for your niche."
              >
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'real_estate', name: 'Real Estate', icon: '🏠' },
                    { id: 'clinic', name: 'Clinic', icon: '⚕️' },
                    { id: 'agency', name: 'Agency / B2B', icon: '💼' },
                  ].map(preset => (
                    <div key={preset.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-blue-500 cursor-pointer transition-colors bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="text-3xl mb-2">{preset.icon}</span>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{preset.name}</h4>
                      <p className="text-xs text-zinc-500 mt-2">Pipelines, Fields & Tags</p>
                      <Button
                        className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 text-xs py-1.5"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to apply the ${preset.name} preset? This will add new pipelines and fields to your workspace.`)) {
                            try {
                              setSubmittingState(true);
                              toast.loading('Applying preset...', { id: 'preset' });
                              const res = await api(`/api/workspace/${workspace.slug}/presets`, {
                                method: 'POST',
                                body: { presetId: preset.id }
                              });
                              if (res.data) {
                                toast.success('Preset applied successfully!', { id: 'preset' });
                                setTimeout(() => router.reload(), 1500);
                              } else {
                                throw new Error(res.error?.msg || 'Error');
                              }
                            } catch (err) {
                              toast.error('Failed to apply preset', { id: 'preset' });
                            } finally {
                              setSubmittingState(false);
                            }
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        Apply Preset
                      </Button>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </Content.Container>
      </div>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
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

export default General;
