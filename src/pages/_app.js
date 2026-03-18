import { useEffect, useState } from 'react';
import Router from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ReactGA from 'react-ga';
import TopBarProgress from 'react-topbar-progress-indicator';
import { SWRConfig } from 'swr';
import useSWR from 'swr';
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";

import progressBarConfig from '@/config/progress-bar/index';
import swrConfig from '@/config/swr/index';
import WorkspaceProvider from '@/providers/workspace';
import fetcher from '@/lib/client/fetcher';
import CookieConsent from '@/components/CookieConsent';

import '@/styles/globals.css';
let enData = require('../messages/en.json');
let ptData = require('../messages/pt.json');
let esData = require('../messages/es.json');
let frData = require('../messages/fr.json');
let deData = require('../messages/de.json');
let itData = require('../messages/it.json');

const SUPPORTED_LANGUAGES = ['en', 'pt', 'es', 'fr', 'de', 'it'];

const normalizeLanguage = (lang) => {
  if (!lang || typeof lang !== 'string') return null;
  const normalized = lang.trim().replace('_', '-').toLowerCase();
  const base = normalized.split('-')[0];
  if (base === 'pt') return 'pt';
  if (base === 'en') return 'en';
  if (base === 'es') return 'es';
  if (base === 'fr') return 'fr';
  if (base === 'de') return 'de';
  if (base === 'it') return 'it';
  return null;
};

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index);
    if (key !== name) continue;
    return decodeURIComponent(part.slice(index + 1));
  }
  return null;
};

const persistLanguage = (lang) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('language', lang);
  } catch (e) {
  }
  document.cookie = `language=${encodeURIComponent(lang)}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = lang;
};

const resources = {
  en: {
    translation: enData
  },
  pt: {
    translation: ptData
  },
  es: {
    translation: esData
  },
  fr: {
    translation: frData
  },
  de: {
    translation: deData
  },
  it: {
    translation: itData
  }
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      initImmediate: false,
      react: {
        useSuspense: false,
      },
      interpolation: {
        escapeValue: false
      }
    });
}

Object.entries(resources).forEach(([lng, bundle]) => {
  i18n.addResourceBundle(lng, 'translation', bundle.translation, true, true);
});

const App = ({ Component, pageProps }) => {
  const [progress, setProgress] = useState(false);
  const [gaReady, setGaReady] = useState(false);
  const [maintenanceDismissed, setMaintenanceDismissed] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  useTranslation();
  const swrOptions = swrConfig();

  useEffect(() => {
    Object.entries(resources).forEach(([lng, bundle]) => {
      i18n.addResourceBundle(lng, 'translation', bundle.translation, true, true);
    });
  }, []);

  const isTruthy = (value) => {
    const v = String(value || '').trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  };

  const { data: maintenanceConfig } = useSWR(
    '/api/public-config?keys=MAINTENANCE_ENABLED,MAINTENANCE_MESSAGE,MAINTENANCE_EXPECTED_AT',
    fetcher,
    { refreshInterval: 60000 }
  );

  const maintenance = maintenanceConfig?.data?.config || {};
  const maintenanceEnabled = isTruthy(maintenance.MAINTENANCE_ENABLED);
  const maintenanceMessage = String(maintenance.MAINTENANCE_MESSAGE || '').trim() || 'Sistema em manutenção';
  const maintenanceExpectedAt = maintenance.MAINTENANCE_EXPECTED_AT
    ? String(maintenance.MAINTENANCE_EXPECTED_AT).trim()
    : null;

  const maintenanceExpectedLabel = (() => {
    if (!maintenanceExpectedAt) return null;
    const parsed = new Date(maintenanceExpectedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
    const candidate = new Date(maintenanceExpectedAt.replace(' ', 'T'));
    if (!Number.isNaN(candidate.getTime())) return candidate.toLocaleString();
    return maintenanceExpectedAt;
  })();

  useEffect(() => {
    TopBarProgress.config(progressBarConfig());

    const handleStart = () => setProgress(true);
    const handleStop = () => setProgress(false);

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleStop);
    Router.events.on('routeChangeError', handleStop);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleStop);
      Router.events.off('routeChangeError', handleStop);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const prefs = JSON.parse(localStorage.getItem('closify_cookie_prefs_v2') || '{}');
        setHasConsent(prefs.analytics === true);
      } catch (e) {
        setHasConsent(false);
      }
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !hasConsent) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/public-config?keys=GOOGLE_ANALYTICS_ID');
        const json = await response.json();
        const gaId =
          json?.data?.config?.GOOGLE_ANALYTICS_ID ||
          process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
        if (!gaId || cancelled) return;
        ReactGA.initialize(gaId);
        setGaReady(true);
      } catch (e) {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasConsent]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!gaReady) return;

    const handleRouteChange = (url) => {
      ReactGA.pageview(url);
    };

    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [gaReady]);

  // Load saved language preference or detect from browser
  useEffect(() => {
    let preferred = null;

    try {
      preferred = normalizeLanguage(localStorage.getItem('language'));
    } catch (e) {
    }

    if (!preferred) {
      preferred = normalizeLanguage(getCookie('language'));
    }

    if (!preferred && typeof navigator !== 'undefined') {
      const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language, navigator.userLanguage].filter(Boolean);

      for (const candidate of candidates) {
        const normalized = normalizeLanguage(candidate);
        if (normalized && SUPPORTED_LANGUAGES.includes(normalized)) {
          preferred = normalized;
          break;
        }
      }
    }

    const target = preferred && SUPPORTED_LANGUAGES.includes(preferred) ? preferred : 'en';
    if (i18n.resolvedLanguage !== target) {
      i18n.changeLanguage(target);
    }
    persistLanguage(target);
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <SWRConfig value={swrOptions}>
        <ThemeProvider attribute="class">
          <WorkspaceProvider>
            {progress && <TopBarProgress />}
            {maintenanceEnabled && !maintenanceDismissed && (
              <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900">
                <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 md:px-8 flex items-start justify-between gap-4">
                  <div className="text-sm">
                    <span className="font-semibold">{maintenanceMessage}</span>
                    {maintenanceExpectedLabel ? (
                      <span className="ml-2 text-amber-800">
                        Previsão de retorno: {maintenanceExpectedLabel}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceDismissed(true)}
                    className="text-xs font-semibold text-amber-900/80 hover:text-amber-900"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
            <Component {...pageProps} />
            <CookieConsent onAccept={() => setHasConsent(true)} />
          </WorkspaceProvider>
        </ThemeProvider>
      </SWRConfig>
    </SessionProvider>
  );
};

export default App;
