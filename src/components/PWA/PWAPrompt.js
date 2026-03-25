import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, BellIcon, DevicePhoneMobileIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const PWAPrompt = () => {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isQrScan, setIsQrScan] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  // Check if current route is landing page (handles both root and tenant rewrites)
  const isLandingPage = router.asPath === '/' || router.pathname === '/' || router.pathname.endsWith('/index');

  useEffect(() => {
    // Detect mobile
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isActuallyMobile = mobileRegex.test(navigator.userAgent);
    setIsMobile(isActuallyMobile);

    // Detect if user came from QR Code
    const params = new URLSearchParams(window.location.search);
    const fromQr = params.get('source') === 'qrcode';
    setIsQrScan(fromQr);

    // Check if previously dismissed in this session
    const dismissedThisSession = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
    if (dismissedThisSession) {
      setHasDismissed(true);
      return;
    }

    // Check for global captured prompt from _document.js
    if (window.__deferredPrompt) {
      setDeferredPrompt(window.__deferredPrompt);
      const shouldShow = isActuallyMobile && !hasDismissed && (
        fromQr || (!isLandingPage && status === 'authenticated')
      );
      
      if (shouldShow) {
        const timer = setTimeout(() => setIsVisible(true), fromQr ? 1000 : 3000);
        return () => clearTimeout(timer);
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay if on appropriate route/auth OR if QR scan
      const shouldShow = isActuallyMobile && !hasDismissed && (
        fromQr || (!isLandingPage && status === 'authenticated')
      );

      if (shouldShow) {
        const timer = setTimeout(() => setIsVisible(true), fromQr ? 1000 : 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Only proceed with side effects (like notification checks) if is actually mobile, not landing page, and authenticated
    if (!isActuallyMobile || isLandingPage || status !== 'authenticated') return;

    // Check for notifications
    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotificationPrompt(true);
      if (!isVisible && !hasDismissed) {
          const timer = setTimeout(() => setIsVisible(true), 5000);
          return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [router.asPath, router.pathname, status, isLandingPage, hasDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setShowNotificationPrompt(false);
      // If we only needed notifications and install isn't available, hide
      if (!deferredPrompt) {
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const canShow = isMobile && isVisible && !hasDismissed && (isQrScan || (status === 'authenticated' && !isLandingPage));
  if (!canShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-[100] md:max-w-md md:left-auto"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5 overflow-hidden relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="bg-blue-600 rounded-xl p-3 flex-shrink-0 shadow-lg shadow-blue-500/20">
              <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {t('pwa.install.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('pwa.install.description')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                {t('pwa.install.button')}
              </button>
            )}

            {showNotificationPrompt && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                        <BellIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {t('pwa.notifications.description')}
                    </p>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                  {t('pwa.notifications.button')}
                </button>
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="w-full text-gray-500 dark:text-gray-400 text-xs font-medium hover:underline mt-1"
            >
              {t('pwa.prompt.close')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAPrompt;
