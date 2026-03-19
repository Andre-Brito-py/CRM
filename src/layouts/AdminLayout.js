import { useEffect } from 'react';
import Router from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import menu from '@/config/menu/admin';

const Sidebar = dynamic(() => import('@/components/Sidebar/index'), { ssr: false });

const AdminLayout = ({ children }) => {
  const { data: session, status } = useSession();
  const require2fa = (() => {
    const raw = String(process.env.NEXT_PUBLIC_SUPERADMIN_REQUIRE_2FA ?? '').trim().toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
    return process.env.NODE_ENV === 'production';
  })();

  useEffect(() => {
    if (status === 'unauthenticated') {
      Router.replace('/auth/login');
    } else if (status === 'authenticated') {
      // Check for SUPERADMIN role
      if (session?.user?.role !== 'SUPERADMIN') {
        // Redirect to home or show unauthorized
        // For development, we might want to bypass this or ensure we have a superadmin
        Router.replace('/');
      } else if (require2fa && !session?.user?.twoFactorEnabled) {
        Router.replace('/account/security?required=2fa');
      }
    }
  }, [status, session, require2fa]);

  if (status === 'loading') return <></>;

  // While redirecting
  if (session?.user?.role !== 'SUPERADMIN') return <></>;
  if (require2fa && !session?.user?.twoFactorEnabled) return <></>;

  return (
    <main className="relative flex flex-col w-screen h-screen space-x-0 text-gray-800 dark:text-gray-200 md:space-x-5 md:flex-row bg-gray-50 dark:bg-gray-800">
      <Sidebar menu={menu()} />
      <Content>
        <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
        <Header />
        {children}
      </Content>
    </main>
  );
};

export default AdminLayout;
