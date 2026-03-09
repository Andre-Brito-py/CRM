import { useState } from 'react';
import Link from 'next/link';

import Actions from './actions';
import Menu from './menu';
import Logo from '@/components/Logo';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspaces } from '@/hooks/data';
import { useWorkspace } from '@/providers/workspace';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const staticMenu = sidebarMenu();

const Sidebar = ({ menu }) => {
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
    <aside id="sidebar-nav" className="sticky z-40 flex flex-col text-zinc-400 bg-zinc-900 border-r border-white/5 md:overflow-y-auto md:w-1/4 md:min-w-[280px] md:h-screen overscroll-contain transition-all duration-300">
      <div className="relative flex items-center justify-between px-6 py-8 border-b border-white/5">
        <Logo variant="full" forceLight={true} className="scale-105" />
        <button className="md:hidden text-zinc-400 hover:text-white transition-colors" onClick={toggleMenu}>
          {showMenu ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </div>

      <div
        className={[
          'flex-col flex-1 pb-10 md:flex md:relative',
          showMenu
            ? 'absolute top-[104px] bg-zinc-900 inset-x-0 bottom-0 z-50 h-[calc(100vh-104px)] overflow-y-auto'
            : 'hidden',
        ].join(' ')}
      >
        <div id="sidebar-actions" className="px-6 py-4">
          <Actions />
        </div>

        <nav className="flex flex-col px-4 mt-4 space-y-1">
          <div className="px-2 py-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2">Main Menu</span>
          </div>
          {renderStaticMenu()}

          <div className="px-2 py-6 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-2">Workspace</span>
          </div>
          {renderMenu()}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
