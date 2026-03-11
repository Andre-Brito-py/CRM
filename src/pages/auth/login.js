import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getProviders, signIn, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { AuthLayout } from '@/layouts/index';
import { useTranslation } from "react-i18next";

const Login = () => {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
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

    setSubmittingState(false);

    if (result.error) {
      if (result.error === '2FA_REQUIRED') {
        setStep('2FA');
        toast('Two-Factor Authentication required', { icon: '🔐' });
      } else {
        toast.error(result.error);
      }
    } else {
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
    signIn(socialId);
  };

  useEffect(() => {
    (async () => {
      const socialProviders = [];
      const { email: emailProvider, credentials, ...providers } = await getProviders();

      for (const provider in providers) {
        socialProviders.push(providers[provider]);
      }

      setSocialProviders([...socialProviders]);
    })();
  }, []);

  return (
    <AuthLayout>
      <Meta title="Nextacular | Login" description="Sign in to your account." />
      <div className="flex flex-col items-center justify-center p-5 m-auto space-y-5 shadow-premium glass rounded-2xl md:p-10 md:w-1/3">
        <div className="text-center mb-4">
          <Link href="/" className="text-3xl font-bold text-gray-900 tracking-tight">
            Nextacular
          </Link>
          <p className="mt-2 text-gray-500">Welcome back! Please enter your details.</p>
        </div>

        {step === 'LOGIN' && (
          <form className="flex flex-col w-full space-y-4" onSubmit={signInWithCredentials}>
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <input
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none transition"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@email.com"
                type="email"
                value={email}
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <input
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none transition"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
                required
              />
            </div>

            <Button
              className="w-full justify-center bg-brand-600 hover:bg-brand-700 text-white"
              disabled={status === 'loading' || !isEmailValid || !password || isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('MAGIC_LINK')}
                className="text-sm text-brand-600 hover:text-brand-800 font-medium"
              >
                Or sign in with a Magic Link
              </button>
            </div>
          </form>
        )}

        {step === '2FA' && (
          <form className="flex flex-col w-full space-y-4" onSubmit={signInWithCredentials}>
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">🔐</div>
              <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <input
              className="px-3 py-3 border rounded-md text-center text-2xl tracking-widest focus:ring-2 focus:ring-brand-500 outline-none transition"
              onChange={(e) => setToken2fa(e.target.value)}
              placeholder="000000"
              type="text"
              maxLength={6}
              value={token2fa}
              required
              autoFocus
            />

            <Button
              className="w-full justify-center bg-brand-600 hover:bg-brand-700 text-white"
              disabled={isSubmitting || token2fa.length < 6}
              type="submit"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setStep('LOGIN'); setToken2fa(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {step === 'MAGIC_LINK' && (
          <form className="flex flex-col w-full space-y-4" onSubmit={signInWithEmail}>
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-700">Email for Magic Link</label>
              <input
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none transition"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@email.com"
                type="email"
                value={email}
                required
              />
            </div>

            <Button
              className="w-full justify-center bg-gray-800 hover:bg-gray-900 text-white"
              disabled={status === 'loading' || !isEmailValid || isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Sending link...' : 'Send Magic Link'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('LOGIN')}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Back to Password Login
              </button>
            </div>
          </form>
        )}

        {step === 'LOGIN' && socialProviders.length > 0 && (
          <>
            <div className="relative w-full flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-sm text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <div className="flex flex-col w-full space-y-3">
              {socialProviders.map((provider, index) => (
                <button
                  key={index}
                  className="py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-75 transition-colors"
                  disabled={status === 'loading'}
                  onClick={() => signInWithSocial(provider.id)}
                >
                  Continue with {provider.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'LOGIN' && (
          <div className="pt-4 text-center border-t border-gray-200 w-full mt-6">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-semibold text-brand-600 hover:text-brand-500">
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default Login;
