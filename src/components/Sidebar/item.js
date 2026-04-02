import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

import { useWorkspace } from '@/providers/workspace';
import useSWR from 'swr';

const Item = ({ data, isLoading, closeMenu }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { workspace } = useWorkspace();
  const router = useRouter();

  const { data: subscriptionData } = useSWR(
    workspace?.slug ? `/api/payments/subscription/status?workspaceSlug=${workspace.slug}` : `/api/payments/subscription/status`,
    { refreshInterval: 60000 }
  );

  const allowedModules = subscriptionData?.data?.features?.allowedModules || {};
  const isActive = router.asPath === data.path;
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  // Check if the module is locked based on the dynamic plan configuration
  const isLocked = !isSuperAdmin && data.moduleKey && allowedModules[data.moduleKey] === false;

  const handleClick = (e) => {
    if (isLocked) {
      e.preventDefault();
      toast(t('sidebar.premium.lockedToast'), {
        icon: '🔒',
        style: {
          borderRadius: '12px',
          background: '#18181b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
    } else {
      if (closeMenu) closeMenu();
    }
  };

  return isLoading ? (
    <div className="h-10 mb-2 bg-white/5 rounded-xl animate-pulse mx-2" />
  ) : (
    <motion.li 
      className="list-none"
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link
        href={isLocked ? '#' : data.path}
        className={`group relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 border border-transparent ${isActive
          ? 'text-white bg-indigo-600/15 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)] ring-1 ring-white/5'
          : isLocked
            ? 'text-zinc-600 cursor-not-allowed grayscale'
            : 'text-zinc-300 hover:text-white hover:bg-white/[0.03] hover:border-white/[0.05]'
          }`}
        onClick={handleClick}
      >
        {isActive && (
          <motion.div 
            layoutId="active-sidebar-pill"
            className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"
          />
        )}
        <span className={`text-[14px] font-medium tracking-tight transition-colors ${isActive ? 'text-white' : ''}`}>
          {t(data.name)}
        </span>
        {isLocked && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-800/40 border border-white/5 backdrop-blur-sm">
            <LockClosedIcon className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider">PRO</span>
          </div>
        )}
        {isActive && !isLocked && (
          <div className="ml-auto w-1 h-1 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
        )}
      </Link>
    </motion.li>
  );
};

Item.defaultProps = {
  data: null,
  isLoading: false,
};

export default Item;
