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
  'Pipeline': RectangleStackIcon,
  'Contacts': PhoneIcon,
  'Companies': BuildingOffice2Icon,
  'Tasks': CheckCircleIcon,
  'common.label.integrations': PuzzlePieceIcon,
  'Automations': BoltIcon,
  'Analytics': ChartBarIcon,
  'NPS Surveys': FaceSmileIcon,
  'NPS Responses': CheckCircleIcon,
  'NPS Analytics': ChartBarIcon,
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
};

const PREMIUM_FEATURES = ['Automations', 'Analytics', 'Message Templates'];

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
const ContextSidebar = ({ items = [], sectionLabel = '', visible = true }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const { workspace, setWorkspace } = useWorkspace();
  const { data: workspacesData, isLoading } = useWorkspaces();
  const [showModal, setModalState] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setSubmittingState] = useState(false);

  const validName = name.length > 0 && name.length <= 16;
  const userSubscription = session?.user?.subscription || 'FREE';
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  const isLocked = (itemName) =>
    PREMIUM_FEATURES.includes(itemName) && userSubscription === 'FREE' && !isSuperAdmin;

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
        className="hidden md:flex flex-col flex-shrink-0 w-[220px] h-full glass-dark border-r border-white/5 overflow-hidden"
      >
        {/* ── Workspace Selector (always visible) ── */}
        <div className="px-3 pt-5 pb-4 border-b border-white/5">
          <span className="block px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            {t('common.label.workspace')}
          </span>

          {/* Create button */}
          <button
            id="create-workspace-btn"
            className="flex items-center gap-2 w-full px-3 py-2 mb-2 text-xs font-semibold text-white premium-gradient rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all"
            onClick={() => setModalState(true)}
          >
            <PlusIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{t('workspace.action.button.label')}</span>
          </button>

          {/* Workspace listbox */}
          <Listbox value={workspace} onChange={handleWorkspaceChange}>
            <div className="relative">
              <Listbox.Button className="relative w-full py-2.5 pl-3 pr-8 text-left bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-300 hover:bg-white/10 transition-all focus:outline-none">
                <span className="block truncate">
                  {isLoading
                    ? t('workspace.fetching')
                    : workspacesData?.workspaces?.length === 0
                    ? t('workspace.message.notfound')
                    : workspace === null
                    ? t('workspace.action.label.select')
                    : workspace.name}
                </span>
                <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <ChevronUpDownIcon className="w-3.5 h-3.5 text-zinc-500" />
                </span>
              </Listbox.Button>

              {workspacesData?.workspaces?.length > 0 && (
                <Listbox.Options className="absolute z-[70] w-full mt-1 py-1.5 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                  {workspacesData.workspaces.map((ws, i) => (
                    <Listbox.Option
                      key={i}
                      value={ws}
                      className={({ active }) =>
                        `flex items-center gap-2 cursor-pointer px-3 py-2 text-xs transition-colors ${
                          active ? 'bg-white/10 text-white' : 'text-zinc-400'
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className={`flex-1 truncate ${selected ? 'font-semibold text-white' : ''}`}>
                            {ws.name}
                          </span>
                          {selected && <CheckIcon className="w-3.5 h-3.5 text-indigo-400" />}
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
        {visible && items.length > 0 && (
          <>
            {/* Section Label */}
            <div className="px-5 pt-5 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 leading-none">
                {sectionLabel}
              </span>
            </div>

            {/* Items */}
            <nav className="flex flex-col px-3 space-y-0.5 flex-1 pb-8 overflow-y-auto">
              {items.map((item, idx) => {
                const locked = isLocked(item.name);
                const active = router.asPath === item.path;
                const Icon = ITEM_ICONS[item.name] || CogIcon;

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Link
                      href={locked ? '#' : item.path}
                      onClick={(e) => {
                        if (locked) {
                          e.preventDefault();
                          toast(t('sidebar.premium.lockedToast'), {
                            icon: '🔒',
                            style: {
                              borderRadius: '12px',
                              background: '#18181b',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.1)',
                            },
                          });
                        }
                      }}
                      prefetch={false}
                      className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 border border-transparent ${
                        active
                          ? 'text-white bg-indigo-600/15 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.08)]'
                          : locked
                          ? 'text-zinc-600 cursor-not-allowed grayscale'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="context-sidebar-pill"
                          className="absolute left-0 w-0.5 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                        />
                      )}
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          active ? 'text-indigo-400' : 'text-zinc-500'
                        }`}
                      />
                      <span className="flex-1 truncate">{t(item.name)}</span>
                      {locked && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800/40 border border-white/5">
                          <LockClosedIcon className="w-2.5 h-2.5 text-zinc-600" />
                          <span className="text-[8px] font-bold text-zinc-600 tracking-wider">PRO</span>
                        </div>
                      )}
                      {active && !locked && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </>
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
    </>
  );
};

export default ContextSidebar;
