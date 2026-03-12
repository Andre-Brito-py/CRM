import { useWorkspace } from '@/providers/workspace';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';

const planTiers = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

/**
 * Paywall component — wraps children with a premium feature gate.
 *
 * Props:
 *   minPlan  — 'STANDARD' | 'PREMIUM' (default: 'STANDARD')
 *   message  — custom description string
 *   compact  — render a small badge instead of full overlay
 */
const Paywall = ({ children, minPlan = 'STANDARD', message, compact = false }) => {
  const { workspace } = useWorkspace();
  const { t } = useTranslation();

  const subType = workspace?.creator?.customerPayment?.subscriptionType || 'FREE';
  const hasAccess = planTiers[subType] >= planTiers[minPlan];

  if (hasAccess) return <>{children}</>;

  // ── Compact badge mode (for inline buttons / small widgets) ──────────
  if (compact) {
    return (
      <div className="relative group inline-flex">
        <div className="pointer-events-none opacity-50 blur-[0.5px] select-none">{children}</div>
        <Link
          href={`/account/${workspace?.slug}/billing`}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full shadow-lg shadow-amber-500/30 whitespace-nowrap">
            <LockClosedIcon className="h-3 w-3" />
            {minPlan}
          </span>
        </Link>
      </div>
    );
  }

  // ── Full overlay mode ────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      {/* Blurred background preview */}
      <div className="opacity-20 pointer-events-none select-none blur-[4px] grayscale">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white/80 to-white/95 dark:from-zinc-900/80 dark:to-zinc-900/95 backdrop-blur-sm">
        <div className="max-w-sm w-full text-center space-y-5">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30 rotate-3 hover:rotate-0 transition-transform duration-300">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
              <LockClosedIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {minPlan} Plan
              </span>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {t('paywall.title', 'Premium Feature')}
            </h3>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {message ||
              t(
                'paywall.message',
                `Upgrade your plan to unlock this powerful feature and scale your business further.`
              )}
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2 text-left">
            {['AI Insights', 'Advanced Analytics', 'Unlimited Automations', 'Priority Support'].map(
              (f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {f}
                </div>
              )
            )}
          </div>

          {/* CTA */}
          <Link
            href={`/account/${workspace?.slug}/billing`}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-2xl shadow-xl shadow-zinc-900/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <SparklesIcon className="h-4 w-4 text-amber-400" />
            {t('paywall.upgrade', 'Upgrade Now')}
          </Link>

          <p className="text-[11px] text-zinc-400">No credit card required to try</p>
        </div>
      </div>
    </div>
  );
};

export default Paywall;
