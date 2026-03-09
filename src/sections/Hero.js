import { useState } from 'react';
import { Bars3Icon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";
import Logo from '@/components/Logo';

const Hero = () => {
  const { status: sessionStatus } = useSession();
  const [showMenu, setMenuVisibility] = useState(false);

  const toggleMenu = () => setMenuVisibility(!showMenu);
  const { t } = useTranslation();

  return (
    <div className="relative bg-zinc-50 overflow-hidden min-h-screen flex flex-col">
      {/* Premium Background Pattern/Gradient */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-300 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-50 flex items-center justify-between px-6 py-8 mx-auto w-full max-w-7xl lg:px-8">
        <Logo className="scale-110" />

        {/* Desktop Nav */}
        <nav className="hidden space-x-10 md:flex">
          <Link href="#features" className="text-base font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            {t("common.label.guides") || "Features"}
          </Link>
          <Link href="#pricing" className="text-base font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            {t("common.label.pricing") || "Pricing"}
          </Link>
          <Link href="#faq" className="text-base font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center justify-end md:flex md:flex-1 lg:w-0">
          <Link
            href={sessionStatus === 'authenticated' ? '/account' : '/auth/login'}
            className="text-base font-medium text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
          >
            {sessionStatus === 'authenticated' ? 'Go to Dashboard' : 'Sign in'}
          </Link>
          {sessionStatus !== 'authenticated' && (
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-6 py-2.5 ml-8 text-base font-semibold text-white premium-gradient rounded-xl shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all border border-indigo-400/20"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-600 focus:outline-none"
            onClick={toggleMenu}
          >
            {showMenu ? <XMarkIcon className="h-8 w-8" /> : <Bars3Icon className="h-8 w-8" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="absolute inset-x-0 top-0 z-[60] origin-top-right transform p-2 transition md:hidden">
          <div className="rounded-2xl glass-light ring-1 ring-black ring-opacity-5 divide-y-2 divide-zinc-100">
            <div className="px-5 pt-5 pb-6">
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 focus:outline-none"
                  onClick={toggleMenu}
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6">
                <nav className="grid gap-y-8">
                  <Link href="#features" className="text-base font-medium text-zinc-900 hover:text-zinc-700">Features</Link>
                  <Link href="#pricing" className="text-base font-medium text-zinc-900 hover:text-zinc-700">Pricing</Link>
                </nav>
              </div>
            </div>
            <div className="py-6 px-5 space-y-6">
              <Link
                href="/auth/register"
                className="flex w-full items-center justify-center px-4 py-3 text-base font-bold text-white premium-gradient rounded-xl shadow-indigo-500/20"
              >
                Sign up
              </Link>
              <p className="text-center text-base font-medium text-zinc-500">
                Existing customer?{' '}
                <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 px-6 mx-auto mt-16 max-w-7xl sm:mt-24 lg:mt-32 lg:px-8 flex-grow">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-1.5 mb-8 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full border border-indigo-100/50 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2 animate-pulse" />
            V1.4 Premium Edition
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-7xl font-executive">
            The Executive CRM for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
              High-Growth Teams
            </span>
          </h1>
          <p className="max-w-md mx-auto mt-6 text-lg text-zinc-500 sm:text-xl md:mt-8 md:text-2xl md:max-w-3xl leading-relaxed">
            Manage your entire business operations with a professional, secure, and lightning-fast platform. Built for performance and designed for clarity.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 mt-10 sm:flex-row sm:mt-12">
            <Link
              href="/auth/register"
              className="flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-white premium-gradient rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-[1.02] transition-all sm:w-auto"
            >
              Start Free Trial
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="#demo"
              className="flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-zinc-700 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:bg-zinc-50 transition-all sm:w-auto"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Mockup Placeholder */}
        <div className="relative mt-20 mb-32 overflow-hidden rounded-3xl border border-zinc-200/50 shadow-2xl bg-white/50 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-2xl aspect-[16/9] flex items-center justify-center text-zinc-500 text-xl font-executive">
            Professional Dashboard Mockup
          </div>
        </div>
      </main>
    </div>
  );
};

export default Hero;
