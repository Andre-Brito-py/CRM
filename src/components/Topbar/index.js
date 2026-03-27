import { Fragment, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Menu, Transition, Popover } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  BellSlashIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  CogIcon,
  CreditCardIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  PlusIcon,
  CheckIcon,
  ChevronUpDownIcon,
  HomeIcon,
  InboxIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  PuzzlePieceIcon,
  BoltIcon,
  ChartBarIcon,
  FaceSmileIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  UsersIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { signOut, useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useWorkspace } from '@/providers/workspace';
import { useWorkspaces } from '@/hooks/data';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Logo from '@/components/Logo';
import api from '@/lib/common/api';
import Modal from '@/components/Modal/index';
import Button from '@/components/Button/index';
import { Listbox } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import HelpModal from '@/sections/help/HelpModal';


// Icon map for menu items
const ITEM_ICONS = {
  'common.label.home': HomeIcon,
  'Inbox': InboxIcon,
  'Pipeline': RectangleStackIcon,
  'Contacts': PhoneIcon,
  'Companies': BuildingOffice2Icon,
  'Tasks': CheckCircleIcon,
  'Web Forms': DocumentTextIcon,
  'common.label.integrations': PuzzlePieceIcon,
  'Automations': BoltIcon,
  'Analytics': ChartBarIcon,
  'nps.menu.surveys': FaceSmileIcon,
  'nps.menu.responses': CheckCircleIcon,
  'nps.menu.analytics': ChartBarIcon,
  'settings.workspace.information': Cog6ToothIcon,
  'settings.domain.configuration': GlobeAltIcon,
  'settings.team.management': UsersIcon,
  'Custom Fields': RectangleStackIcon,
  'Message Templates': DocumentTextIcon,
  'settings.advanced': WrenchScrewdriverIcon,
  'common.label.dashboard': HomeIcon,
  'common.label.billing': CreditCardIcon,
  'common.label.settings': CogIcon,
  'common.label.security': UserCircleIcon,
  'common.label.presets': BoltIcon,
};

const PREMIUM_FEATURES = ['Automations', 'Analytics', 'Message Templates'];

const Topbar = ({ menu, staticMenu }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { workspace, setWorkspace } = useWorkspace();
  const { data: workspacesData, isLoading } = useWorkspaces();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications(workspace?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showModal, setModalState] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setSubmittingState] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const validName = name.length > 0 && name.length <= 16;

  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    workspace?.slug ? `/api/workspace/${workspace.slug}/notifications` : null,
    { refreshInterval: 30000 } // Refresh every 30s
  );

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api(`/api/workspace/${workspace.slug}/notifications`, { method: 'PUT' });
      mutateNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api(`/api/workspace/${workspace.slug}/notifications/${id}`, { method: 'PUT' });
      mutateNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cookie = document.cookie || '';
    setIsImpersonating(cookie.includes('vysify_impersonating=1'));
  }, []);



  const logOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const toggleTheme = (e) => {
    e.preventDefault();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleWorkspaceChange = (ws) => {
    setWorkspace(ws);
    router.replace(`/account/${ws?.slug}`);
  };

  const createWorkspace = (e) => {
    e.preventDefault();
    setSubmittingState(true);
    api('/api/workspace', { body: { name }, method: 'POST' }).then((response) => {
      setSubmittingState(false);
      if (response.errors) {
        Object.keys(response.errors).forEach((err) => toast.error(response.errors[err].msg));
      } else {
        setModalState(false);
        setName('');
        toast.success(t('workspace.created.success'));
      }
    });
  };

  const userSubscription = session?.user?.subscription || 'FREE';
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  const isItemLocked = (itemName) =>
    PREMIUM_FEATURES.includes(itemName) && userSubscription === 'FREE' && !isSuperAdmin;

  // Determine active top-level section from path
  const isSettingsPath = router.asPath.includes('/settings');
  const isAccountStaticPath =
    router.asPath === '/account' ||
    router.asPath === '/account/billing' ||
    router.asPath === '/account/settings' ||
    router.asPath === '/account/security';

  const topSections = [
    {
      id: 'account',
      label: t('common.label.account'),
      items: staticMenu?.[0]?.menuItems || [],
    },
    {
      id: 'workspace',
      label: t('common.label.workspace'),
      items: menu?.find((m) => m.name === 'Workspace')?.menuItems || [],
    },
    {
      id: 'customer-satisfaction',
      label: t('common.label.customerSatisfaction'),
      items: menu?.find((m) => m.name === 'Customer Satisfaction')?.menuItems || [],
    },
    {
      id: 'settings',
      label: t('common.label.settings'),
      items: menu?.find((m) => m.name === 'Settings')?.menuItems || [],
    },
  ];

  return (
    <>
      <header
        id="topbar-nav"
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 glass-dark border-b border-white/5 shadow-2xl shadow-black/40"
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-8">
          <Link href="/account" className="flex-shrink-0">
            <Logo variant="full" forceLight className="scale-95 hover:scale-100 transition-transform duration-300" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {topSections
              .filter((section) => section.items?.length > 0)
              .map((section) => (
                <NavDropdown
                  key={section.id}
                  section={section}
                  t={t}
                  router={router}
                  workspace={workspace}
                  workspacesData={workspacesData}
                  isLoading={isLoading}
                  isItemLocked={isItemLocked}
                  handleWorkspaceChange={handleWorkspaceChange}
                  toggleModal={() => setModalState(true)}
                  mobileClose={() => setMobileOpen(false)}
                />
              ))}
          </nav>
        </div>

        {/* Right: Notifications + User Menu */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Popover className="relative hidden sm:block">
            {({ open }) => (
              <>
                <Popover.Button
                  className={`flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 transition-all duration-200 ${open ? 'text-white bg-white/10 border-indigo-500/50' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                  title="Notificações"
                >
                  <BellIcon className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></span>
                    </span>
                  )}
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-2 scale-95"
                  enterTo="opacity-100 translate-y-0 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0 scale-100"
                  leaveTo="opacity-0 translate-y-2 scale-95"
                >
                  <Popover.Panel className="absolute right-0 mt-3 w-80 origin-top-right bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notificações</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase underline decoration-indigo-500/30"
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center">
                          <BellSlashIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                          <p className="text-xs text-zinc-500">Nenhuma notificação por aqui.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-4 hover:bg-white/5 transition-colors cursor-pointer group relative ${!n.isRead ? 'bg-white/[0.02]' : ''}`}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.link) router.push(n.link);
                            }}
                          >
                            {!n.isRead && (
                              <div className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                            <div className="pl-2">
                              <p className={`text-sm font-semibold ${!n.isRead ? 'text-white' : 'text-zinc-400'}`}>
                                {n.title}
                              </p>
                              {n.content && (
                                <p className="mt-1 text-xs text-zinc-500 truncate group-hover:whitespace-normal transition-all">
                                  {n.content}
                                </p>
                              )}
                              <p className="mt-2 text-[10px] text-zinc-600 font-medium">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 bg-black/20 border-t border-white/5 flex items-center justify-center">
                      <button
                        onClick={isSubscribed ? unsubscribe : subscribe}
                        className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                      >
                        {isSubscribed ? '🔔 Desativar Notificações do Navegador' : '🔕 Ativar Notificações do Navegador'}
                      </button>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>

          {/* Help Menu */}
          <button
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            onClick={() => setHelpOpen(true)}
            title="Ajuda"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button
              id="topbar-user-menu"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-semibold"
            >
              <UserCircleIcon className="w-5 h-5 text-zinc-400" />
              <span className="hidden sm:inline max-w-[120px] truncate">
                {session?.user?.name || session?.user?.email}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-zinc-500" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute right-0 mt-2 w-60 origin-top-right bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] divide-y divide-white/5 z-50 overflow-hidden backdrop-blur-xl">
                {session?.user?.role === 'SUPERADMIN' && (
                  <div className="p-2">
                    <Menu.Item>
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <ComputerDesktopIcon className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    </Menu.Item>
                  </div>
                )}
                <div className="p-2">
                  <Menu.Item>
                    <Link
                      href="/account/settings"
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <CogIcon className="w-4 h-4" />
                      {t('common.label.account')}
                    </Link>
                  </Menu.Item>
                  <Menu.Item>
                    <Link
                      href="/account/billing"
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <CreditCardIcon className="w-4 h-4" />
                      {t('common.label.billing')}
                    </Link>
                  </Menu.Item>
                  <Menu.Item>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? (
                        <><SunIcon className="w-4 h-4" /><span>{t('common.label.light.mode')}</span></>
                      ) : (
                        <><MoonIcon className="w-4 h-4" /><span>{t('common.label.dark.mode')}</span></>
                      )}
                    </button>
                  </Menu.Item>
                </div>
                <div className="p-2">
                  {isImpersonating && (
                    <Menu.Item>
                      <button
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all"
                        onClick={async () => {
                          try {
                            toast.loading('Saindo do masquerade...', { id: 'stop_masq' });
                            const res = await api('/api/impersonation/stop', { method: 'POST' });
                            if (res?.error?.msg) throw new Error(res.error.msg);
                            toast.success('Masquerade finalizado', { id: 'stop_masq' });
                            window.location.href = '/admin/users';
                          } catch (e) {
                            toast.error(e?.message || 'Falha ao finalizar masquerade', { id: 'stop_masq' });
                          }
                        }}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Parar masquerade
                      </button>
                    </Menu.Item>
                  )}
                  <Menu.Item>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                      onClick={logOut}
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      {t('common.label.logout')}
                    </button>
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden fixed top-16 inset-x-0 z-40 glass-dark border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <MobileWorkspaceSelector
                workspace={workspace}
                workspacesData={workspacesData}
                isLoading={isLoading}
                handleWorkspaceChange={handleWorkspaceChange}
                toggleModal={() => setModalState(true)}
                t={t}
              />
              {topSections
                .filter((section) => section.items?.length > 0)
                .map((section) => (
                  <MobileSection
                    key={section.id}
                    section={section}
                    t={t}
                    router={router}
                    workspace={workspace}
                    workspacesData={workspacesData}
                    isLoading={isLoading}
                    isItemLocked={isItemLocked}
                    handleWorkspaceChange={handleWorkspaceChange}
                    toggleModal={() => setModalState(true)}
                    close={() => setMobileOpen(false)}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Workspace Modal */}
      <Modal show={showModal} title={t('workspace.action.create.title')} toggle={() => setModalState(false)}>
        <div className="space-y-6">
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t('workspace.action.create.description.lineOne')}
          </p>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
              {t('workspace.action.name.label')}
            </h3>
            <input
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-zinc-900 dark:text-white"
              disabled={isSubmitting}
              placeholder={t('workspace.suggesion.label')}
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </div>
          <Button
            className="w-full py-4 text-white premium-gradient rounded-xl shadow-xl shadow-indigo-500/25 disabled:opacity-50"
            disabled={!validName || isSubmitting}
            onClick={createWorkspace}
          >
            <span className="font-bold">{t('workspace.action.button.label')}</span>
          </Button>
        </div>
      </Modal>

      {/* Help Modal */}
      <HelpModal isOpen={helpOpen} toggle={() => setHelpOpen(false)} />
    </>

  );
};

/** Desktop hover dropdown for each top-level section */
const NavDropdown = ({
  section,
  t,
  router,
  workspace,
  workspacesData,
  isLoading,
  isItemLocked,
  handleWorkspaceChange,
  toggleModal,
  mobileClose,
}) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  const isActive =
    section.id === 'settings'
      ? router.asPath.includes('/settings/')
      : section.id === 'account'
        ? (router.asPath === '/account' ||
          router.asPath === '/account/billing' ||
          router.asPath.startsWith('/account/settings') ||
          router.asPath === '/account/security')
        && !router.asPath.includes(`/account/${workspace?.slug}`)
        : section.id === 'customer-satisfaction'
          ? Boolean(workspace && router.asPath.includes(`/account/${workspace?.slug}/customer-satisfaction`))
          : section.id === 'workspace' && workspace && router.asPath.startsWith(`/account/${workspace?.slug}`);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
          ? 'text-white bg-white/10'
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
      >
        {t(section.label) || section.label}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
        {isActive && (
          <motion.div
            layoutId="topbar-active-indicator"
            className="absolute inset-x-2 -bottom-[1px] h-0.5 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-64 glass-dark border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >


            {/* Menu items */}
            <div className="p-2">
              {section.items.map((item, idx) => {
                const locked = isItemLocked(item.name);
                const active = router.asPath === item.path;
                const Icon = ITEM_ICONS[item.name] || CogIcon;
                return (
                  <Link
                    key={idx}
                    href={locked ? '#' : item.path}
                    onClick={(e) => {
                      if (locked) {
                        e.preventDefault();
                        toast(t('sidebar.premium.lockedToast'), {
                          icon: '🔒',
                          style: { borderRadius: '12px', background: '#18181b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                        });
                      }
                      setOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${active
                      ? 'text-white bg-brand-600/20 border border-brand-500/30'
                      : locked
                        ? 'text-zinc-600 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-brand-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span className="flex-1">{t(item.name)}</span>
                    {locked && (
                      <span className="text-[9px] font-bold text-zinc-600 bg-zinc-800/50 border border-white/5 rounded-md px-1.5 py-0.5">PRO</span>
                    )}
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Mobile-only workspace selector */
const MobileWorkspaceSelector = ({ workspace, workspacesData, isLoading, handleWorkspaceChange, toggleModal, t }) => {
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden p-3 bg-white/[0.02]">
      <span className="block px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
        {t('common.label.workspace')}
      </span>
      <div className="space-y-2">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-white premium-gradient rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
          onClick={toggleModal}
        >
          <PlusIcon className="w-4 h-4" />
          {t('workspace.action.button.label')}
        </button>
        <Listbox value={workspace} onChange={handleWorkspaceChange}>
          <div className="relative">
            <Listbox.Button className="relative w-full py-2.5 pl-3 pr-8 text-left bg-zinc-900 border border-white/10 rounded-xl text-sm font-medium text-white hover:bg-zinc-800 transition-all focus:outline-none">
              <span className="block truncate">
                {isLoading ? t('workspace.fetching') :
                  workspacesData?.workspaces?.length === 0 ? t('workspace.message.notfound') :
                    workspace === null ? t('workspace.action.label.select') : workspace.name}
              </span>
              <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <ChevronUpDownIcon className="w-4 h-4 text-zinc-500" />
              </span>
            </Listbox.Button>
            {workspacesData?.workspaces?.length > 0 && (
              <Listbox.Options className="relative w-full mt-2 py-1.5 bg-zinc-900/50 border border-white/5 rounded-xl max-h-40 overflow-y-auto">
                {workspacesData.workspaces.map((ws, i) => (
                  <Listbox.Option
                    key={i}
                    value={ws}
                    className={({ active }) =>
                      `flex items-center gap-3 cursor-pointer px-3 py-2 text-sm transition-colors ${active ? 'bg-white/10 text-white' : 'text-zinc-400'}`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`flex-1 truncate ${selected ? 'font-bold text-white' : ''}`}>{ws.name}</span>
                        {selected && <CheckIcon className="w-4 h-4 text-indigo-400" />}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            )}
          </div>
        </Listbox>
      </div>
    </div>
  );
};

/** Mobile accordion section */
const MobileSection = ({ section, t, router, workspace, workspacesData, isLoading, isItemLocked, handleWorkspaceChange, toggleModal, close }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        {t(section.label) || section.label}
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">

              {section.items.map((item, idx) => {
                const locked = isItemLocked(item.name);
                const active = router.asPath === item.path;
                const Icon = ITEM_ICONS[item.name] || CogIcon;
                return (
                  <Link
                    key={idx}
                    href={locked ? '#' : item.path}
                    onClick={(e) => {
                      if (locked) {
                        e.preventDefault();
                        toast(t('sidebar.premium.lockedToast'), { icon: '🔒' });
                      } else {
                        close();
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'text-white bg-indigo-600/20' : locked ? 'text-zinc-600' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{t(item.name)}</span>
                    {locked && <span className="text-[9px] font-bold text-zinc-600 ml-auto">PRO</span>}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Topbar;
