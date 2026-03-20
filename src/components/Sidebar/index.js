import { useState } from 'react';
import Link from 'next/link';

import Actions from './actions';
import Menu from './menu';
import Logo from '@/components/Logo';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspaces } from '@/hooks/data';
import { useWorkspace } from '@/providers/workspace';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const staticMenu = sidebarMenu();

const Sidebar = ({ menu }) => {
  const { t } = useTranslation();
  const [showMenu, setMenuVisibility] = useState(false);
  const { data, isLoading } = useWorkspaces();
  const { workspace } = useWorkspace();

  const renderMenu = () => {
    return (
      menu.map((item, index) => {
        const isAdmin = item.name === 'Admin';

        if (!workspace && !isAdmin) return null;

        return (
          <Menu
            key={index}
            data={item}
            isLoading={isLoading}
            showMenu={data?.workspaces.length > 0 || isLoading || isAdmin}
            closeMenu={() => setMenuVisibility(false)}
          />
        );
      })
    );
  };

  const renderStaticMenu = () => {
    return staticMenu.map((item, index) => (
      <Menu
        key={index}
        data={item}
        showMenu={true}
        closeMenu={() => setMenuVisibility(false)}
      />
    ));
  };

  const toggleMenu = () => setMenuVisibility(!showMenu);

  return (
    <aside id="sidebar-nav" className="sticky z-40 flex flex-col glass-dark md:overflow-y-auto md:w-1/4 md:min-w-[280px] md:h-screen overscroll-contain transition-all duration-500 shadow-2xl shadow-black/50 border-r border-white/5">
      <div className="relative flex items-center justify-between px-8 py-10 border-b border-white/5 font-executive">
        <Logo variant="full" forceLight={true} href="/account" className="scale-110 transition-transform duration-500 hover:scale-[1.12]" />
        <button className="md:hidden text-zinc-400 hover:text-white transition-colors" onClick={toggleMenu}>
          {showMenu ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </div>

      <div
        className={[
          'flex-col flex-1 pb-10 md:flex md:relative',
          showMenu
            ? 'absolute top-[104px] bg-zinc-900 inset-x-0 bottom-0 z-50 h-[calc(100vh-104px)] overflow-y-auto pt-4'
            : 'hidden',
        ].join(' ')}
      >
        <div id="sidebar-actions" className="px-6 py-6 font-executive">
          <Actions />
        </div>

        <nav className="flex flex-col px-6 mt-2 space-y-1.5 flex-1 pb-12 font-executive">
          <div className="px-3 py-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300 px-2 leading-none">{t('sidebar.mainMenu')}</span>
          </div>
          {renderStaticMenu()}

          <div className="px-3 py-6 mt-6 border-t border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300 px-2 leading-none">{t('common.label.workspace')}</span>
          </div>
          {renderMenu()}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
