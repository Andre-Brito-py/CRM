import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

const PREMIUM_FEATURES = ['Automations', 'Analytics', 'Message Templates'];

const Item = ({ data, isLoading, closeMenu }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();

  const isActive = router.asPath === data.path;
  const isPremiumFeature = PREMIUM_FEATURES.includes(data.name);
  const userSubscription = session?.user?.subscription || 'FREE';
  const isLocked = isPremiumFeature && userSubscription === 'FREE';

  const handleClick = (e) => {
    if (isLocked) {
      e.preventDefault();
      toast('Upgrade to Premium to access this feature.', {
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
    <li className="list-none">
      <Link
        href={isLocked ? '#' : data.path}
        className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 border border-transparent ${isActive
            ? 'text-white bg-indigo-600/10 border-indigo-500/20 shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]'
            : isLocked
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        onClick={handleClick}
      >
        <span className={`text-sm font-medium transition-colors ${isActive ? 'text-white' : ''}`}>
          {t(data.name)}
        </span>
        {isLocked && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/50 border border-white/5">
            <LockClosedIcon className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-500">PRO</span>
          </div>
        )}
        {isActive && !isLocked && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
        )}
      </Link>
    </li>
  );
};

Item.defaultProps = {
  data: null,
  isLoading: false,
};

export default Item;
