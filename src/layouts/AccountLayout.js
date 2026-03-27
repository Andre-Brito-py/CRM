import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Topbar from '@/components/Topbar/index';
import ContextSidebar from '@/components/ContextSidebar/index';
import menu from '@/config/menu/index';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspace } from '@/providers/workspace';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import usePlanFeatures from '@/hooks/data/usePlanFeatures';

const staticMenu = sidebarMenu();

const AccountLayout = ({ children, full = false, immersive = false }) => {
  const { status, data: session } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const { workspace } = useWorkspace();

  const requiredTermsVersion = process.env.NEXT_PUBLIC_TERMS_VERSION || '2026-03-13';
  const currentSlug = workspace?.slug || router.query.workspaceSlug;
  const isOwner = useMemo(() => {
    const email = session?.user?.email || null;
    if (!email || !workspace?.members) return false;
    return workspace.members.some((m) => {
      const memberEmail = m?.email || m?.member?.email || null;
      return memberEmail === email && m?.teamRole === 'OWNER';
    });
  }, [session?.user?.email, workspace?.members]);
  const workspaceMenu = currentSlug ? menu(currentSlug, { isOwner }) : [];
  const { allowedModules, trial } = usePlanFeatures();

  // Filtra seções inteiras do menu cujo módulo está desabilitado
  const filteredMenu = workspaceMenu.map(section => {
    // Se a seção inteira tem moduleKey desabilitado, remove (mas mantém para superadmin)
    return {
      ...section,
      menuItems: section.menuItems, // Itens individuais filtrados no ContextSidebar via isLocked
    };
  });

  // Determine active context sidebar section from current path
  const activeSection = useMemo(() => {
    const path = router.asPath;
    const slug = currentSlug;

    if (slug && path.includes(`/account/${slug}/settings`)) {
      const settingsSection = workspaceMenu.find((m) => m.name === 'Settings');
      return { label: t('common.label.settings'), items: settingsSection?.menuItems || [] };
    }
    if (slug && path.includes(`/account/${slug}/customer-satisfaction`)) {
      const csSection = workspaceMenu.find((m) => m.name === 'Customer Satisfaction');
      return { label: t('common.label.customerSatisfaction'), items: csSection?.menuItems || [] };
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

  useEffect(() => {
    if (status !== 'authenticated') return;
    const acceptedAt = session?.user?.termsAcceptedAt || null;
    const acceptedVersion = session?.user?.termsVersion || null;
    if (!acceptedAt || acceptedVersion !== requiredTermsVersion) {
      const next = encodeURIComponent(router.asPath || '/account');
      router.replace(`/terms?next=${next}`);
    }
  }, [status, session?.user?.termsAcceptedAt, session?.user?.termsVersion, requiredTermsVersion, router]);

  if (status === 'loading') return <></>;

  return (
    <main className="relative flex flex-col w-screen h-screen overflow-hidden selection:bg-brand-100 selection:text-brand-900 transition-colors duration-300">
      {/* Top navigation bar */}
      {!immersive && <Topbar menu={filteredMenu} staticMenu={staticMenu} />}

      {/* Trial banner */}
      {trial.hasTrial && (
        <div className={`flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium ${trial.expired
          ? 'bg-red-600 text-white'
          : trial.daysLeft <= 3
            ? 'bg-amber-500 text-white'
            : 'bg-amber-100 text-amber-800'
          }`}>
          {trial.expired ? (
            <>
              <span>⚠️ Seu período de teste expirou.</span>
              <Link href="/account/billing" className="underline font-bold hover:opacity-80">
                Fazer upgrade agora
              </Link>
            </>
          ) : (
            <>
              <span>⏳ {trial.daysLeft} {trial.daysLeft === 1 ? 'dia restante' : 'dias restantes'} no período de teste.</span>
              <Link href="/account/billing" className="underline font-bold hover:opacity-80">
                Ver planos
              </Link>
            </>
          )}
        </div>
      )}

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
        {!immersive && (
          <ContextSidebar
            items={activeSection?.items || []}
            sectionLabel={activeSection?.label || ''}
            visible={!!activeSection && activeSection.items?.length > 0}
            allowedModules={allowedModules}
          />
        )}

        {/* Main content area */}
        <div className={`relative flex flex-col flex-1 h-full bg-[var(--bg-primary)] ${full ? '' : 'overflow-y-auto'}`}>
          <div className={full ? 'flex-1 h-full' : 'px-6 py-8 lg:px-10 lg:py-10'}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AccountLayout;
