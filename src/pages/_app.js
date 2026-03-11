import { useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ReactGA from 'react-ga';
import TopBarProgress from 'react-topbar-progress-indicator';
import { SWRConfig } from 'swr';
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";

import progressBarConfig from '@/config/progress-bar/index';
import swrConfig from '@/config/swr/index';
import WorkspaceProvider from '@/providers/workspace';

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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

const App = ({ Component, pageProps }) => {
  const [progress, setProgress] = useState(false);
  useTranslation();
  const router = useRouter();
  const swrOptions = swrConfig();

  Router.events.on('routeChangeStart', () => setProgress(true));
  Router.events.on('routeChangeComplete', () => setProgress(false));
  TopBarProgress.config(progressBarConfig());

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      ReactGA.initialize(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID);
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => {
      ReactGA.pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

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
            <Component {...pageProps} />
          </WorkspaceProvider>
        </ThemeProvider>
      </SWRConfig>
    </SessionProvider>
  );
};

export default App;
