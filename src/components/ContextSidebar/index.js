import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Listbox } from '@headlessui/react';
import {
  LockClosedIcon,
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
  CogIcon,
  CreditCardIcon,
  UserCircleIcon,
  PlusIcon,
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useWorkspace } from '@/providers/workspace';
import { useWorkspaces } from '@/hooks/data';
import api from '@/lib/common/api';
import Button from '@/components/Button/index';
import Modal from '@/components/Modal/index';

const ITEM_ICONS = {
  'common.label.home': HomeIcon,
  'Inbox': InboxIcon,
  'Chat Interno': UsersIcon,
  'Pipeline': RectangleStackIcon,
  'Contacts': PhoneIcon,
  'Companies': BuildingOffice2Icon,
  'Tasks': CheckCircleIcon,
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
  'Produtos': CreditCardIcon,
  'settings.advanced': WrenchScrewdriverIcon,
  'common.label.dashboard': HomeIcon,
  'common.label.billing': CreditCardIcon,
  'common.label.settings': CogIcon,
  'common.label.security': UserCircleIcon,
};


/**
 * ContextSidebar – narrow left panel that shows:
 *  1. Workspace selector (always visible at top)
 *  2. Sub-navigation items for the active Topbar section
 *
 * Props:
 *  - items: array of { name, path } for the active section
 *  - sectionLabel: string label of the active section
 *  - visible: boolean – whether to show the sub-items (workspace selector always shows)
 */
const ContextSidebar = ({ items = [], sectionLabel = '', visible = true, allowedModules = {} }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const { workspace, setWorkspace } = useWorkspace();
  const { data: workspacesData, isLoading } = useWorkspaces();
  const [showModal, setModalState] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setSubmittingState] = useState(false);

  const validName = name.length > 0 && name.length <= 16;
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  // Módulo bloqueado se tem moduleKey e está desabilitado no plano
  const isLocked = (item) => {
    if (isSuperAdmin) return false;
    if (!item.moduleKey) return false;
    return allowedModules[item.moduleKey] === false;
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

  return (
    <>
      {/* The sidebar is always rendered so the workspace selector is always visible */}
      <aside
        id="context-sidebar"
        className="hidden md:flex flex-col flex-shrink-0 w-[260px] h-full bg-white/70 dark:bg-zinc-900/40 backdrop-blur-3xl border-r border-white/40 dark:border-zinc-800/40 overflow-hidden"
      >
        {/* ── Workspace Selector (always visible) ── */}
        <div className="px-6 pt-10 pb-8 border-b border-zinc-100 dark:border-zinc-800/50">
          <span className="block px-1 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 italic">
            {t('common.label.workspace')}
          </span>

          {/* Create button */}
          <button
            id="create-workspace-btn"
            className="flex items-center justify-center gap-3 w-full px-5 py-3.5 mb-6 text-xs font-black text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.03] active:scale-95 transition-all group"
            onClick={() => setModalState(true)}
          >
            <PlusIcon className="w-4 h-4 flex-shrink-0 group-hover:rotate-90 transition-transform duration-500" />
            <span className="truncate italic uppercase tracking-widest">{t('workspace.action.button.label')}</span>
          </button>

          {/* Workspace listbox */}
          <Listbox value={workspace} onChange={handleWorkspaceChange}>
            <div className="relative">
              <Listbox.Button className="relative w-full py-4 pl-5 pr-10 text-left bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-all focus:outline-none ring-offset-2 ring-indigo-500/10 focus:ring-4">
                <span className="block truncate italic uppercase tracking-tight">
                  {isLoading
                    ? t('workspace.fetching')
                    : workspacesData?.workspaces?.length === 0
                      ? t('workspace.message.notfound')
                      : workspace === null
                        ? t('workspace.action.label.select')
                        : workspace.name}
                </span>
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronUpDownIcon className="w-4 h-4 text-zinc-400" />
                </span>
              </Listbox.Button>

              {workspacesData?.workspaces?.length > 0 && (
                <Listbox.Options className="absolute z-[70] w-full mt-3 py-2 vysify-glass rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-60 overflow-y-auto custom-scrollbar">
                  {workspacesData.workspaces.map((ws, i) => (
                    <Listbox.Option
                      key={i}
                      value={ws}
                      className={({ active }) =>
                        `flex items-center gap-3 cursor-pointer px-5 py-3 text-xs transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900'
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${selected ? 'bg-indigo-500 shadow-glow-indigo' : 'bg-transparent border border-zinc-300'}`} />
                          <span className={`flex-1 truncate font-bold uppercase tracking-tight italic ${selected ? 'text-zinc-900 dark:text-white' : ''}`}>
                            {ws.name}
                          </span>
                          {selected && <CheckIcon className="w-4 h-4 text-indigo-500" />}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              )}
            </div>
          </Listbox>
        </div>

        {/* ── Contextual nav items (section-dependent) ── */}
        {visible && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Section Label */}
            <div className="px-7 pt-10 pb-5">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 leading-none italic">
                {sectionLabel}
              </span>
            </div>

            {/* Items */}
            <nav className="flex flex-col px-4 space-y-2 flex-1 pb-10 overflow-y-auto custom-scrollbar">
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const locked = isLocked(item);
                  const active = router.asPath === item.path;
                  const Icon = ITEM_ICONS[item.name] || CogIcon;

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ x: 4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      <Link
                        href={locked ? '#' : item.path}
                        onClick={(e) => {
                          if (locked) {
                            e.preventDefault();
                            toast(t('sidebar.premium.lockedToast'), {
                              icon: '🔒',
                              style: {
                                borderRadius: '1.25rem',
                                background: '#18181b',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '1rem 1.5rem',
                                fontSize: '13px',
                                fontWeight: 'bold'
                              },
                            });
                          }
                        }}
                        prefetch={false}
                        className={`relative flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-[13px] font-black transition-all duration-300 group ${active
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10 shadow-[0_4px_20px_rgba(99,102,241,0.08)]'
                          : locked
                            ? 'text-zinc-400 cursor-not-allowed opacity-50'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50'
                          }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="context-sidebar-pill"
                            className="absolute left-0 w-1 h-6 bg-indigo-600 dark:bg-indigo-500 rounded-r-full shadow-glow-indigo"
                          />
                        )}
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 transition-colors duration-500 ${active ? 'text-indigo-600 dark:text-indigo-500' : 'text-zinc-400 group-hover:text-indigo-500'
                            }`}
                        />
                        <span className="flex-1 truncate uppercase tracking-tight italic">{t(item.name)}</span>
                        
                        {locked && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 text-white border border-white/5">
                            <span className="text-[8px] font-black tracking-widest italic">ELITE</span>
                          </div>
                        )}
                        
                        {active && !locked && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse shadow-glow-indigo" />
                        )}
                      </Link>
                    </motion.div>
                  );
                })
              ) : (
                <div className="px-6 py-10 text-center opacity-30 select-none">
                  <RectangleStackIcon className="w-10 h-10 mx-auto mb-4 text-zinc-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Selecione uma categoria</p>
                </div>
              )}
            </nav>
          </div>
        )}
      </aside>

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
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-zinc-900 dark:text-white"
              disabled={isSubmitting}
              placeholder={t('workspace.suggesion.label')}
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </div>
          <Button
            className="w-full py-4 text-white premium-gradient rounded-xl shadow-xl shadow-brand-500/25 disabled:opacity-50"
            disabled={!validName || isSubmitting}
            onClick={createWorkspace}
          >
            <span className="font-bold">{t('workspace.action.button.label')}</span>
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ContextSidebar;
