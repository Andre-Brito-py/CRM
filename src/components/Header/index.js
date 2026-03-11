import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  CogIcon,
  CreditCardIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  BellIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTranslation } from "react-i18next";
import { useTheme } from 'next-themes';
import { useWorkspace } from '@/providers/workspace';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const Header = () => {
  const { data } = useSession();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications(workspace?.id);

  const logOut = () => {
    const result = confirm('Are you sure you want to logout?');

    if (result) {
      signOut({ callbackUrl: '/' });
    }
  };

  const toggleTheme = (event) => {
    event.preventDefault();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex flex-row items-center justify-between px-8 py-4 mb-8 transition-all duration-300 glass-light dark:glass-dark rounded-[2rem] border-zinc-200 dark:border-white/5 shadow-premium">
      <div>
        <h5 className="font-executive font-bold text-lg tracking-tight">
          {data && data.user && (
            <span>{data.user.name || data.user.email}</span>
          )}
        </h5>
      </div>
      <div className="flex items-center space-x-4">
        <button
          className="flex items-center justify-center w-12 h-12 transition-all duration-300 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-indigo-300 group"
          onClick={isSubscribed ? unsubscribe : subscribe}
          title={isSubscribed ? "Disable Notifications" : "Enable Notifications"}
        >
          {isSubscribed ? <BellIcon className="w-5 h-5 text-indigo-500" /> : <BellSlashIcon className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500" />}
        </button>
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button id="header-user-menu" className="flex items-center justify-center px-8 py-3.5 space-x-3 transition-all duration-300 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 dark:hover:bg-zinc-700 hover:scale-[1.02] active:scale-95 font-bold text-sm ring-1 ring-white/5">
              <CogIcon aria-hidden="true" className="w-5 h-5 text-zinc-400" />
              <span>{t("common.label.account")}</span>
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95 translate-y-2"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100 translate-y-0"
            leaveTo="transform opacity-0 scale-95 translate-y-2"
          >
            <Menu.Items className="absolute right-0 w-64 mt-4 origin-top-right bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 divide-y divide-zinc-100 dark:divide-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl">
              {data?.user?.role === 'SUPERADMIN' && (
                <div className="p-2">
                  <Menu.Item>
                    <Link
                      href="/admin"
                      className="flex items-center w-full px-4 py-2.5 space-x-3 text-sm font-medium text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors group"
                    >
                      <ComputerDesktopIcon aria-hidden="true" className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </Menu.Item>
                </div>
              )}
              <div className="p-2">
                <Menu.Item>
                    <Link
                      href="/account/settings"
                      className="flex items-center w-full px-4 py-3 space-x-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group"
                    >
                      <UserCircleIcon aria-hidden="true" className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                      <span>{t("common.label.account")}</span>
                    </Link>
                </Menu.Item>
                <Menu.Item>
                  <Link
                    href="/account/billing"
                    className="flex items-center w-full px-4 py-2.5 space-x-3 text-sm font-medium text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors group"
                  >
                    <CreditCardIcon aria-hidden="true" className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                    <span>{t("common.label.billing")}</span>
                  </Link>
                </Menu.Item>
              </div>
              <div className="p-2">
                <Menu.Item>
                  <Link
                    href="/"
                    className="flex items-center w-full px-4 py-2.5 space-x-3 text-sm font-medium text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors group"
                  >
                    <ComputerDesktopIcon aria-hidden="true" className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                    <span>{t("common.label.landingpage")}</span>
                  </Link>
                </Menu.Item>
                <Menu.Item>
                  <button
                    className="flex items-center w-full px-4 py-2.5 space-x-3 text-sm font-medium text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors group"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? (
                      <>
                        <SunIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                        <span>{t("common.label.light.mode")}</span>
                      </>
                    ) : (
                      <>
                        <MoonIcon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                        <span>{t("common.label.dark.mode")}</span>
                      </>
                    )}
                  </button>
                </Menu.Item>
              </div>
              <div className="p-2">
                <Menu.Item>
                  <button
                    className="flex items-center w-full px-4 py-3 space-x-3 text-sm font-semibold text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
                    onClick={logOut}
                  >
                    <ArrowRightOnRectangleIcon
                      aria-hidden="true"
                      className="w-5 h-5 text-red-400 group-hover:text-red-600"
                    />
                    <span>{t("common.label.logout")}</span>
                  </button>
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
};

export default Header;
