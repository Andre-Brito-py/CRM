import { useEffect, useState } from 'react';
import { Bars3Icon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } }
};

const Hero = () => {
  const { status: sessionStatus } = useSession();
  const [showMenu, setMenuVisibility] = useState(false);
  const [mounted, setMounted] = useState(false);

  const toggleMenu = () => setMenuVisibility(!showMenu);
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = mounted && sessionStatus === 'authenticated';

  return (
    <div className="relative bg-[#0a0a0b] overflow-hidden min-h-screen flex flex-col text-white selection:bg-indigo-500/30">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 z-0 opacity-40">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[150px]" 
        />
      </div>

      <header className="relative z-50 flex items-center justify-between px-6 py-8 mx-auto w-full max-w-7xl lg:px-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Logo className="scale-110 invert grayscale brightness-200" />
        </motion.div>

        {/* Desktop Nav */}
        <motion.nav 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden space-x-10 md:flex"
        >
          <Link href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            {t("common.label.guides") || "Features"}
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            {t("common.label.pricing") || "Pricing"}
          </Link>
          <Link href="#faq" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            {t("landing.nav.faq", "FAQ")}
          </Link>
        </motion.nav>

        {/* Desktop Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          className="hidden items-center justify-end md:flex md:flex-1 lg:w-0"
        >
          <Link
            href={isAuthenticated ? '/account' : '/auth/login'}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
          >
            {isAuthenticated ? t("landing.nav.dashboard", "Go to Dashboard") : t("landing.nav.signin", "Sign in")}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-6 py-2.5 ml-8 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              {t("landing.nav.getstarted", "Get Started")}
            </Link>
          )}

          {/* Language Selector */}
          <select
            className="px-3 py-1.5 ml-4 text-xs font-medium text-zinc-300 bg-white/5 border border-zinc-700/50 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            onChange={(e) => {
              const lang = e.target.value;
              i18n.changeLanguage(lang);
              try {
                localStorage.setItem('language', lang);
              } catch (e) {}
              document.cookie = `language=${encodeURIComponent(lang)}; path=/; max-age=31536000; samesite=lax`;
              document.documentElement.lang = lang;
            }}
            value={currentLang}
          >
            <option value="en" className="text-black">EN</option>
            <option value="pt" className="text-black">PT</option>
            <option value="es" className="text-black">ES</option>
          </select>
        </motion.div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            type="button"
            className="text-zinc-400 hover:text-white focus:outline-none"
            onClick={toggleMenu}
          >
            {showMenu ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="absolute inset-x-0 top-0 z-[60] origin-top-right transform p-2 transition md:hidden">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl divide-y divide-zinc-800">
            <div className="px-5 pt-5 pb-6">
              <div className="flex items-center justify-between">
                <Logo className="invert" />
                <button
                  type="button"
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none"
                  onClick={toggleMenu}
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6">
                <nav className="grid gap-y-8">
                  <Link href="#features" className="text-base font-medium text-zinc-300 hover:text-white">{t("common.label.guides") || "Features"}</Link>
                  <Link href="#pricing" className="text-base font-medium text-zinc-300 hover:text-white">{t("common.label.pricing") || "Pricing"}</Link>
                </nav>
              </div>
            </div>
            <div className="py-6 px-5 space-y-6">
              <Link
                href="/auth/register"
                className="flex w-full items-center justify-center px-4 py-3 text-base font-bold text-white bg-indigo-600 rounded-xl"
              >
                {t("landing.nav.signup", "Sign up")}
              </Link>
              <p className="text-center text-base font-medium text-zinc-400">
                {t("landing.nav.existing", "Existing customer?")}{' '}
                <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">{t("landing.nav.signin", "Sign in")}</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 px-6 mx-auto mt-16 max-w-7xl sm:mt-24 lg:mt-32 lg:px-8 flex-grow flex flex-col items-center justify-center">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center w-full"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center px-4 py-1.5 mb-8 text-sm font-medium text-indigo-300 bg-indigo-500/10 rounded-full border border-indigo-500/20 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse" />
            V1.5 Cloud Edition
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl font-executive">
            {t("landing.hero.title1")} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">
              {t("landing.hero.title2")}
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="max-w-md mx-auto mt-6 text-lg text-zinc-400 sm:text-xl md:mt-8 md:text-2xl md:max-w-3xl leading-relaxed">
            {t("landing.hero.subtitle")}
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-4 mt-10 sm:flex-row sm:mt-12">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/auth/register"
                className="group relative flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-2xl shadow-xl hover:bg-indigo-500 transition-all sm:w-auto"
              >
                <span className="absolute inset-0 w-full h-full -mt-1 rounded-2xl opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                <span className="relative flex items-center">
                  {t("landing.hero.startFreeTrial")}
                  <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="absolute inset-0 w-full h-full rounded-2xl border border-white/20"></span>
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/demo"
                className="flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-zinc-300 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:text-white transition-all sm:w-auto backdrop-blur-md"
              >
                {t("landing.hero.viewDemo")}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Dashboard Mockup (Screenshot gerado) */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, type: "spring" }}
          className="relative mt-20 mb-32 w-full max-w-6xl"
        >
          {/* Glow effect behind mockup */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-20"></div>
          
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#0a0a0b] p-2 sm:p-4 group"
          >
            <div className="rounded-2xl flex flex-col overflow-hidden relative border border-white/5 bg-[#0a0a0b]">
               {/* Traffic Lights / Browser Bar */}
               <div className="flex gap-2 p-4 bg-[#111113] border-b border-white/5">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                 <div className="ml-4 flex-1 flex">
                   <div className="mx-auto bg-[#0a0a0b] rounded-md px-4 py-1 text-xs text-zinc-500 tracking-wider">
                     acme-corp.closify.com
                   </div>
                 </div>
               </div>
               
               {/* Real Screenshot Output */}
               <div className="relative aspect-[16/9] w-full bg-zinc-900 overflow-hidden">
                 {/* This img accesses our puppeteer-generated image */}
                 <img
                    src="/images/mockups/dashboard.png"
                    alt="Closify Dashboard View"
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                 />
                 
                 {/* Gradient Fade out at bottom for style */}
                 <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/50 to-transparent"></div>
               </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default Hero;
