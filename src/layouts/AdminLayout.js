import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import menu from '@/config/menu/admin';

const AdminLayout = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    } else if (status === 'authenticated') {
      // Check for SUPERADMIN role
      if (session?.user?.role !== 'SUPERADMIN') {
        // Redirect to home or show unauthorized
        // For development, we might want to bypass this or ensure we have a superadmin
        router.replace('/');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') return <></>;

  // While redirecting
  if (session?.user?.role !== 'SUPERADMIN') return <></>;

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
