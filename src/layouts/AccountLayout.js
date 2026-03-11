import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import menu from '@/config/menu/index';
import { useWorkspace } from '@/providers/workspace';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const AccountLayout = ({ children }) => {
  const { status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const { workspace } = useWorkspace();

  const dashboardSteps = [
    {
      element: '#sidebar-nav',
      popover: {
        title: t('onboarding.tour.dashboard.step1.title'),
        description: t('onboarding.tour.dashboard.step1.desc'),
        position: 'right',
      }
    },
    {
      element: '#create-workspace-btn',
      popover: {
        title: t('onboarding.tour.dashboard.step2.title'),
        description: t('onboarding.tour.dashboard.step2.desc'),
        position: 'right',
      }
    },
    {
      element: '#header-user-menu',
      popover: {
        title: t('onboarding.tour.dashboard.step3.title'),
        description: t('onboarding.tour.dashboard.step3.desc'),
        position: 'bottom',
      }
    }
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return <></>;
  return (
    <main className="relative flex flex-col w-screen h-screen overflow-hidden md:flex-row selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      <Sidebar menu={menu(workspace?.slug)} />
      <OnboardingTour tourId="dashboard-tour" steps={dashboardSteps} active={!workspace} />
      <Content>
        <div className="relative flex flex-col flex-1 h-full overflow-y-auto bg-[var(--bg-primary)]">
          <Toaster 
            position="bottom-left" 
            toastOptions={{ 
              duration: 10000,
              className: 'dark:bg-zinc-900 dark:text-white dark:border dark:border-zinc-800'
            }} 
          />
          <Header />
          <div className="px-6 py-10 lg:px-10 lg:py-12">
            {children}
          </div>
        </div>
      </Content>
    </main>
  );
};

export default AccountLayout;
