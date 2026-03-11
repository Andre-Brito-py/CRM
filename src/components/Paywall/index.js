import { useWorkspace } from '@/providers/workspace';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LockClosedIcon } from '@heroicons/react/24/outline';

const planTiers = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

const Paywall = ({ children, minPlan = 'STANDARD', fallback, message }) => {
  const { workspace } = useWorkspace();
  const { t } = useTranslation();
  
  const subType = workspace?.creator?.customerPayment?.subscriptionType || 'FREE';
  
  const hasAccess = planTiers[subType] >= planTiers[minPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return fallback;
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-white border border-gray-200">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-sm">
        <div className="p-6 bg-white rounded-xl shadow-2xl text-center max-w-sm border border-gray-100 transform transition-all hover:scale-105">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <LockClosedIcon className="w-6 h-6 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            {t('paywall.title', 'Premium Feature')}
          </h3>
          <p className="mb-6 text-sm text-gray-500 leading-relaxed">
            {message || t('paywall.message', `Upgrade to the ${minPlan} plan or higher to unlock this powerful feature and scale your business.`)}
          </p>
          <Link href={`/account/${workspace?.slug}/billing`} className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 bg-gray-900 hover:bg-black rounded-lg shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
            {t('paywall.upgrade', 'View Plans')}
          </Link>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none select-none blur-[3px] grayscale">
        {children}
      </div>
    </div>
  );
};

export default Paywall;
