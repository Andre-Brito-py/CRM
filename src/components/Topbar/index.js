import { Fragment, useState, useRef, useEffect, useMemo } from 'react';
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

// Icons and constants...

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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const validName = name.length > 0 && name.length <= 16;

  // Base64 notification sound (soft ping)
  const notificationSound = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU1vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT18=');
  }, []);

  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    workspace?.slug ? `/api/workspace/${workspace.slug}/notifications` : null,
    { refreshInterval: 10000 } // Refresh every 10s for faster response
  );

  const { data: subscriptionData } = useSWR(
    workspace?.slug ? `/api/payments/subscription/status?workspaceSlug=${workspace.slug}` : `/api/payments/subscription/status`,
    { refreshInterval: 60000 } // Refresh every minute
  );

  const userSubscriptionData = subscriptionData?.data || null;
  const planName = userSubscriptionData?.planName || (userSubscriptionData?.subscriptionType === 'FREE' ? 'Grátis' : '');
  const allowedModules = userSubscriptionData?.features?.allowedModules || {};

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
    
    // Load sound preference
    const savedSound = localStorage.getItem('vysify_sound_enabled');
    setSoundEnabled(savedSound === 'true');
  }, []);

  useEffect(() => {
    if (notificationsData?.unreadCount > prevUnreadCount) {
      if (soundEnabled && notificationSound) {
        notificationSound.play().catch(e => console.log('Sound blocked by browser policy'));
      }
    }
    setPrevUnreadCount(notificationsData?.unreadCount || 0);
  }, [notificationsData?.unreadCount, soundEnabled, notificationSound, prevUnreadCount]);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('vysify_sound_enabled', String(newVal));
  };



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

  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  const isItemLocked = (item) => {
    if (isSuperAdmin) return false;
    // If a moduleKey is defined, check if it's explicitly allowed in the plan
    if (item.moduleKey) {
      return allowedModules[item.moduleKey] === false;
    }
    return false;
  };

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
        className="sticky top-0 z-50 flex items-center justify-between px-8 h-20 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-3xl border-b border-white/40 dark:border-zinc-800/40 shadow-2xl shadow-zinc-200/20 dark:shadow-none"
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-12">
          <Link href="/account" className="flex-shrink-0">
            <Logo variant="full" className="scale-105 hover:scale-110 transition-transform duration-500" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2" aria-label="Navegação principal">
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
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Popover className="relative hidden sm:block">
            {({ open }) => (
              <>
                <Popover.Button
                  className={`flex items-center justify-center w-10 h-10 rounded-[1.1rem] transition-all duration-300 ${open ? 'text-indigo-600 bg-indigo-50 border-indigo-200 shadow-glow-indigo/10' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm'}`}
                  title="Notificações"
                >
                  <BellIcon className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] border-2 border-white dark:border-zinc-900"></span>
                    </span>
                  )}
                </Popover.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-300"
                  enterFrom="opacity-0 translate-y-3 scale-95"
                  enterTo="opacity-100 translate-y-0 scale-100"
                  leave="transition ease-in duration-200"
                  leaveFrom="opacity-100 translate-y-0 scale-100"
                  leaveTo="opacity-0 translate-y-3 scale-95"
                >
                  <Popover.Panel className="absolute right-0 mt-4 w-[380px] origin-top-right vysify-glass rounded-[2.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
                    <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">Notificações</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-70 uppercase tracking-widest italic flex items-center gap-2"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Limpar tudo
                        </button>
                      )}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-16 text-center">
                          <BellSlashIcon className="w-12 h-12 mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tudo limpo por aqui</p>
                        </div>
                      ) : (
                        notifications.map((n, idx) => (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer group relative ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.link) router.push(n.link);
                            }}
                          >
                            <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                <BellIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 pr-4">
                                <p className={`text-sm leading-tight mb-1 font-bold ${!n.isRead ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                  {n.title}
                                </p>
                                {n.content && (
                                  <p className="text-xs text-zinc-400 truncate group-hover:whitespace-normal group-hover:line-clamp-3 transition-all">
                                    {n.content}
                                  </p>
                                )}
                                <p className="mt-3 text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">
                                  {new Date(n.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {!n.isRead && (
                              <div className="absolute top-1/2 -translate-y-1/2 right-6 w-2 h-2 rounded-full bg-indigo-500 shadow-glow-indigo" />
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>
                    <div className="p-5 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col items-center gap-3">
                      <button
                        onClick={toggleSound}
                        className="text-[9px] font-black text-zinc-500 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em] italic flex items-center gap-2"
                      >
                         <div className={`w-3 h-3 rounded-full ${soundEnabled ? 'bg-indigo-500 shadow-glow-indigo' : 'bg-zinc-300'}`} />
                         {soundEnabled ? 'Aviso sonoro ativado' : 'Ativar aviso sonoro'}
                      </button>
                      <button
                        onClick={isSubscribed ? unsubscribe : subscribe}
                        className="text-[9px] font-black text-zinc-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.2em] italic"
                      >
                        {isSubscribed ? 'Desativar notificações Push' : 'Ativar notificações Push'}
                      </button>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
          
          {/* Support Hub */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-[1.1rem] text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm transition-all duration-300"
            title="Ajuda e Suporte"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button
              id="topbar-user-menu"
              className="flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-[1.5rem] bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:border-indigo-500/30 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:scale-105 transition-transform overflow-hidden relative">
                {session?.user?.image ? (
                   <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-7 h-7 text-zinc-400" />
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight italic leading-none mb-1">
                  {session?.user?.name || session?.user?.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1 opacity-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {planName ? `Plano ${planName}` : (t('landing.pricing.free') || 'Grátis')}
                  </span>
                </div>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-zinc-400 group-hover:translate-y-0.5 transition-transform" />
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-3"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-3"
            >
              <Menu.Items className="absolute right-0 mt-4 w-64 origin-top-right bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.2)] z-50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50 border border-white/40 dark:border-zinc-800/40">
                {session?.user?.role === 'SUPERADMIN' && (
                  <div className="p-3">
                    <Menu.Item>
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      >
                        <ComputerDesktopIcon className="w-5 h-5 opacity-60" />
                        Admin Dashboard
                      </Link>
                    </Menu.Item>
                  </div>
                )}
                <div className="p-3">
                  {[
                    { href: '/account/settings', icon: CogIcon, label: t('common.label.account') },
                    { href: '/account/billing', icon: CreditCardIcon, label: t('common.label.billing') },
                  ].map((item) => (
                    <Menu.Item key={item.label}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      >
                        <item.icon className="w-5 h-5 opacity-60" />
                        {item.label}
                      </Link>
                    </Menu.Item>
                  ))}
                  <Menu.Item>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? (
                        <><SunIcon className="w-5 h-5 opacity-60" /><span>Modo Claro</span></>
                      ) : (
                        <><MoonIcon className="w-5 h-5 opacity-60" /><span>Modo Escuro</span></>
                      )}
                    </button>
                  </Menu.Item>
                </div>
                <div className="p-3">
                  <Menu.Item>
                    <button
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-500/10 rounded-xl transition-all uppercase tracking-widest italic"
                      onClick={logOut}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      {t('common.label.logout')}
                    </button>
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-[1.2rem] bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-400 hover:text-zinc-900 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="lg:hidden fixed top-20 inset-x-4 z-40 vysify-glass rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden p-6"
          >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
          ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10'
          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5'
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
            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >


            {/* Menu items */}
            <div className="p-2">
              {section.items.map((item, idx) => {
                const locked = isItemLocked(item);
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                      active
                        ? 'text-zinc-900 dark:text-white bg-brand-600/10 dark:bg-brand-600/20 border border-brand-500/20 dark:border-brand-500/30'
                        : locked
                          ? 'text-zinc-400 cursor-not-allowed'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-brand-400' : locked ? 'text-zinc-400' : 'text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`} />
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
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition-all"
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
                const locked = isItemLocked(item);
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'text-zinc-900 dark:text-white bg-indigo-600/10 dark:bg-indigo-600/20' : locked ? 'text-zinc-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5'
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
