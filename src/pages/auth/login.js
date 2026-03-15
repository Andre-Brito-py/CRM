import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getProviders, signIn, useSession } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { useTranslation } from "react-i18next";
import { redirectToCheckout } from '@/lib/client/stripe';

const Login = () => {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState('LOGIN'); // LOGIN, 2FA, MAGIC_LINK

  const [isSubmitting, setSubmittingState] = useState(false);
  const [socialProviders, setSocialProviders] = useState([]);

  const isEmailValid = isEmail(email);

  useEffect(() => {
    if (router.query.verified === 'true') {
      toast.success('Email verified successfully! You can now log in.');
    }
  }, [router.query]);

  const signInWithCredentials = async (event) => {
    event.preventDefault();
    setSubmittingState(true);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      token2fa: token2fa || undefined
    });

    if (result.error) {
      if (result.error === '2FA_REQUIRED') {
        setSubmittingState(false);
        setStep('2FA');
        toast('Two-Factor Authentication required', { icon: '🔐' });
      } else if (result.error === 'PAYMENT_METHOD_REQUIRED') {
        try {
          const resp = await fetch('/api/auth/payment-method-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const json = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            throw new Error(json?.error?.msg || 'Unable to start card setup');
          }
          const sessionId = json?.data?.sessionId;
          if (!sessionId) {
            throw new Error('Unable to start card setup');
          }
          toast('Você precisa cadastrar um cartão para continuar.', { icon: '💳' });
          await redirectToCheckout(sessionId);
        } catch (e) {
          toast.error(e?.message || 'Unable to start card setup');
        } finally {
          setSubmittingState(false);
        }
      } else {
        setSubmittingState(false);
        toast.error(result.error);
      }
    } else {
      setSubmittingState(false);
      router.push('/account');
    }
  };

  const signInWithEmail = async (event) => {
    event.preventDefault();
    setSubmittingState(true);
    const response = await signIn('email', { email, redirect: false });

    if (response.error === null) {
      toast.success(`We sent a magic link to ${email}.`, { duration: 5000 });
      setEmail('');
      setStep('LOGIN');
    } else {
      toast.error('Failed to send magic link');
    }

    setSubmittingState(false);
  };

  const signInWithSocial = (socialId) => {
    const raw = router.query?.callbackUrl;
    const callbackUrl = typeof raw === 'string' && raw.startsWith('/') ? raw : '/account';
    signIn(socialId, { callbackUrl });
  };

  useEffect(() => {
    (async () => {
      const socialProviders = [];
      const providers = await getProviders();
      
      if (providers) {
          const { email: emailProvider, credentials, ...others } = providers;
          for (const provider in others) {
            socialProviders.push(others[provider]);
          }
      }

      setSocialProviders([...socialProviders]);
    })();
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Meta title="Closify | Login" description="Sign in to your account." />
      <Toaster position="bottom-center" toastOptions={{ duration: 10000 }} />
      
      {/* Left side: branding/image style with modern gradients and mockup preview */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0a0a0b] flex-col items-center justify-center p-12 overflow-hidden">
        {/* Abstract background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-12">
             <Link href="/">
                <img src="/images/logo-full.png" alt="Closify Logo" className="h-10 w-auto cursor-pointer" style={{ filter: 'brightness(0) invert(1)' }} />
             </Link>
          </div>
          <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Acelere suas vendas com <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Inteligência Real.</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            Gerencie leads, automatize processos e feche negócios mais rápido com o CRM mais intuitivo e poderoso do mercado.
          </p>
          
          <div className="mt-8 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img 
              src="/images/mockups/dashboard.png" 
              alt="Dashboard Preview" 
              className="rounded-lg shadow-2xl border border-white/5 transform group-hover:translate-y-[-5px] transition-transform duration-500" 
            />
          </div>
        </div>
        
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-sm text-gray-500">
          <p>© 2026 Closify CRM. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-20 bg-gray-50 lg:bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="lg:hidden mb-12 text-center">
             <Link href="/">
                <img src="/images/logo-full.png" alt="Closify Logo" className="h-8 w-auto mx-auto mb-4 cursor-pointer" />
             </Link>
          </div>

          <div className="text-left space-y-2">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bem-vindo de volta!</h1>
            <p className="text-gray-500 text-lg">Acesse sua conta para gerenciar seus negócios.</p>
          </div>

          {step === 'LOGIN' && (
            <div className="space-y-6">
              <form className="space-y-5" onSubmit={signInWithCredentials}>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm placeholder:text-gray-400"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      type="email"
                      value={email}
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-700">Senha</label>
                      <button type="button" onClick={() => setStep('MAGIC_LINK')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                        Esqueceu a senha?
                      </button>
                    </div>
                    <input
                      className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm placeholder:text-gray-400"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      value={password}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center group cursor-pointer">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-indigo-600 checked:bg-indigo-600 transition-all"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">Lembrar-me por 30 dias</span>
                  </label>
                </div>

                <Button
                  className="w-full py-4 justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all font-bold text-base"
                  disabled={status === 'loading' || !isEmailValid || !password || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Iniciando sessão...' : 'Entrar no Closify'}
                </Button>
              </form>

              {socialProviders.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="px-3 bg-white text-gray-400 font-medium">ou continue com</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {socialProviders.map((provider) => (
                      <button
                        key={provider.id}
                        className="flex items-center justify-center px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all group"
                        disabled={status === 'loading'}
                        onClick={() => signInWithSocial(provider.id)}
                      >
                        {provider.id === 'google' && (
                          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                          Continuar com {provider.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === '2FA' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl mb-6 shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Autenticação em duas etapas</h2>
                <p className="text-gray-500 mt-2 text-lg">Digite o código de 6 dígitos gerado pelo seu dispositivo.</p>
              </div>

              <form className="space-y-6" onSubmit={signInWithCredentials}>
                <input
                  className="w-full px-4 py-5 bg-white border-2 border-gray-100 rounded-2xl text-center text-4xl font-black tracking-[0.4em] focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm"
                  onChange={(e) => setToken2fa(e.target.value)}
                  placeholder="000000"
                  type="text"
                  maxLength={6}
                  value={token2fa}
                  required
                  autoFocus
                />

                <Button
                  className="w-full py-4 justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold text-lg"
                  disabled={isSubmitting || token2fa.length < 6}
                  type="submit"
                >
                  {isSubmitting ? 'Verificando...' : 'Confirmar Acesso'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('LOGIN'); setToken2fa(''); }}
                  className="w-full text-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                >
                  Voltar para o login
                </button>
              </form>
            </div>
          )}

          {step === 'MAGIC_LINK' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl mb-6 shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Link Mágico</h2>
                <p className="text-gray-500 mt-2 text-lg">Insira seu e-mail para receber um link de acesso instantâneo via e-mail.</p>
              </div>

              <form className="space-y-6" onSubmit={signInWithEmail}>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Email corporativo</label>
                  <input
                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    type="email"
                    value={email}
                    required
                  />
                </div>

                <Button
                  className="w-full py-4 justify-center bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg transition-all font-bold text-lg"
                  disabled={status === 'loading' || !isEmailValid || isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Enviando...' : 'Receber Link Mágico'}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('LOGIN')}
                  className="w-full text-center text-sm font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-wider"
                >
                  Entrar com senha
                </button>
              </form>
            </div>
          )}

          <div className="pt-8 text-center border-t border-gray-100 w-full mt-10">
            <p className="text-base text-gray-600">
              Ainda não tem uma conta?{' '}
              <Link href="/auth/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors decoration-2 hover:underline underline-offset-8">
                Crie sua conta gratuita agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
