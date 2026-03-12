import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Topbar from '@/components/Topbar/index';
import ContextSidebar from '@/components/ContextSidebar/index';
import menu from '@/config/menu/index';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspace } from '@/providers/workspace';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const staticMenu = sidebarMenu();

const AccountLayout = ({ children }) => {
  const { status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const { workspace } = useWorkspace();

  const currentSlug = workspace?.slug || router.query.workspaceSlug;
  const workspaceMenu = currentSlug ? menu(currentSlug) : [];

  // Determine active context sidebar section from current path
  const activeSection = useMemo(() => {
    const path = router.asPath;
    const slug = currentSlug;

    if (slug && path.includes(`/account/${slug}/settings`)) {
      const settingsSection = workspaceMenu.find((m) => m.name === 'Settings');
      return { label: t('common.label.settings'), items: settingsSection?.menuItems || [] };
    }
    if (slug && path.startsWith(`/account/${slug}`)) {
      const wsSection = workspaceMenu.find((m) => m.name === 'Workspace');
      return { label: t('common.label.workspace'), items: wsSection?.menuItems || [] };
    }
    // Account-level paths
    if (
      path === '/account' ||
      path === '/account/billing' ||
      path.startsWith('/account/settings') ||
      path === '/account/security'
    ) {
      return { label: t('common.label.account'), items: staticMenu[0]?.menuItems || [] };
    }
    return null;
  }, [router.asPath, currentSlug, workspaceMenu, t]);

  const dashboardSteps = [
    {
      element: '#topbar-nav',
      popover: {
        title: t('onboarding.tour.dashboard.step1.title'),
        description: t('onboarding.tour.dashboard.step1.desc'),
        position: 'bottom',
      },
    },
    {
      element: '#create-workspace-btn',
      popover: {
        title: t('onboarding.tour.dashboard.step2.title'),
        description: t('onboarding.tour.dashboard.step2.desc'),
        position: 'bottom',
      },
    },
    {
      element: '#topbar-user-menu',
      popover: {
        title: t('onboarding.tour.dashboard.step3.title'),
        description: t('onboarding.tour.dashboard.step3.desc'),
        position: 'bottom',
      },
    },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return <></>;

  return (
    <main className="relative flex flex-col w-screen h-screen overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      {/* Top navigation bar */}
      <Topbar menu={workspaceMenu} staticMenu={staticMenu} />

      <OnboardingTour tourId="dashboard-tour" steps={dashboardSteps} active={!workspace} />

      <Toaster
        position="bottom-left"
        toastOptions={{
          duration: 10000,
          className: 'dark:bg-zinc-900 dark:text-white dark:border dark:border-zinc-800',
        }}
      />

      {/* Body row: optional ContextSidebar + main content */}
      <div className="relative flex flex-row flex-1 min-h-0 overflow-hidden">
        <ContextSidebar
          items={activeSection?.items || []}
          sectionLabel={activeSection?.label || ''}
          visible={!!activeSection && activeSection.items?.length > 0}
        />

        {/* Main content area */}
        <div className="relative flex flex-col flex-1 h-full overflow-y-auto bg-[var(--bg-primary)]">
          <div className="px-6 py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AccountLayout;
