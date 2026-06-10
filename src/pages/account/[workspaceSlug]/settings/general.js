import { useEffect, useState } from 'react';
import { 
  DocumentDuplicateIcon, 
  HomeIcon, 
  BuildingOffice2Icon, 
  BriefcaseIcon, 
  SparklesIcon, 
  RocketLaunchIcon, 
  AcademicCapIcon, 
  SunIcon, 
  CakeIcon 
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
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

const presetIcons = {
  real_estate: HomeIcon,
  clinic: BuildingOffice2Icon,
  agency: BriefcaseIcon,
  aesthetics: SparklesIcon,
  dealership: RocketLaunchIcon,
  infoproducts: AcademicCapIcon,
  solar_energy: SunIcon,
  restaurant: CakeIcon,
};

const General = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState(workspace.name || '');
  const [slug, setSlug] = useState(workspace.slug || '');
  const [aiContext, setAiContext] = useState(workspace.aiContext || '');
  const [aiSchedulingEnabled, setAiSchedulingEnabled] = useState(workspace.aiSchedulingEnabled || false);
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

  const changeAiScheduling = (event) => {
    const checked = event.target.checked;
    setAiSchedulingEnabled(checked);
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/ai-scheduling`, {
      body: { aiSchedulingEnabled: checked },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);
      if (response.error) {
        toast.error(response.error.msg);
        setAiSchedulingEnabled(!checked); // revert
      } else {
        toast.success(checked ? 'AI Scheduling enabled!' : 'AI Scheduling disabled!');
      }
    }).catch(() => {
      setSubmittingState(false);
      setAiSchedulingEnabled(!checked);
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
    setAiSchedulingEnabled(workspace.aiSchedulingEnabled || false);
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
      <Meta title={`Vysify - ${workspace.name} | Settings`} />
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
                  className="text-white bg-brand-600 hover:bg-brand-500"
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
                  className="text-white bg-brand-600 hover:bg-brand-500"
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
              title={t("settings.workspace.id")}
              subtitle={t("settings.workspace.id.description")}
            >
              <div className="flex items-center justify-between px-3 py-2 space-x-5 font-mono text-sm border rounded md:w-1/2">
                <span className="overflow-x-auto">{workspace.workspaceCode}</span>
                <CopyToClipboard
                  onCopy={copyToClipboard}
                  text={workspace.workspaceCode}
                >
                  <DocumentDuplicateIcon className="w-5 h-5 cursor-pointer hover:text-brand-600" />
                </CopyToClipboard>
              </div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body
              title="AI Business Context"
              subtitle="Describe your company, products, and sales style to help Vysify AI suggest better replies and insights."
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

          {isTeamOwner && (
            <Card>
              <Card.Body
                title="Permitir agendamentos por IA"
                subtitle="Ative esta opção se desejar que o Autopilot marque reuniões e serviços usando o Google Calendar conectado."
              >
                <div className="flex items-center space-x-3 mt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={aiSchedulingEnabled}
                      onChange={changeAiScheduling}
                      disabled={isSubmitting}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">
                    {aiSchedulingEnabled ? 'Agendamentos via IA Ativados' : 'Desativado'}
                  </span>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Presets Card */}
          {isTeamOwner && (
            <Card>
              <Card.Body
                title={t("settings.workspace.presets.title")}
                subtitle={t("settings.workspace.presets.description")}
              >
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'real_estate' },
                    { id: 'clinic' },
                    { id: 'agency' },
                    { id: 'aesthetics' },
                    { id: 'dealership' },
                    { id: 'infoproducts' },
                    { id: 'solar_energy' },
                    { id: 'restaurant' },
                  ].map(preset => {
                    const Icon = presetIcons[preset.id] || HomeIcon;
                    const presetName = t(`settings.workspace.presets.industry.${preset.id}`);
                    return (
                      <div key={preset.id} className="group border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-brand-500 hover:shadow-xl hover:shadow-brand-500/10 cursor-pointer transition-all duration-300 bg-white dark:bg-zinc-900 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icon className="w-10 h-10 mb-3 text-zinc-400 group-hover:text-brand-600 transition-colors" />
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{presetName}</h4>
                        <p className="text-xs text-zinc-500 mt-2">{t("settings.workspace.presets.custom")}</p>
                        <Button
                          className="mt-4 w-full bg-brand-600 text-white hover:bg-brand-700 text-xs py-1.5"
                          onClick={async () => {
                            if (confirm(t("settings.workspace.presets.confirm", { name: presetName }))) {
                              try {
                                setSubmittingState(true);
                                toast.loading(t("settings.workspace.presets.applying"), { id: 'preset' });
                                const res = await api(`/api/workspace/${workspace.slug}/presets`, {
                                  method: 'POST',
                                  body: { presetId: preset.id }
                                });
                                if (res.data) {
                                  toast.success(t("settings.workspace.presets.success"), { id: 'preset' });
                                  setTimeout(() => router.reload(), 1500);
                                } else {
                                  throw new Error(res.error?.msg || 'Error');
                                }
                              } catch (err) {
                                toast.error(t("settings.workspace.presets.err"), { id: 'preset' });
                              } finally {
                                setSubmittingState(false);
                              }
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          {t("settings.workspace.presets.apply")}
                        </Button>
                      </div>
                    );
                  })}
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

export default General;
