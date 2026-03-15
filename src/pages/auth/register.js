import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getProviders, signIn } from 'next-auth/react';
import toast, { Toaster } from 'react-hot-toast';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { redirectToCheckout } from '@/lib/client/stripe';
import { getAllPlans } from '@/prisma/services/plan';

const Register = ({ plans, initialPlanSlug }) => {
    const router = useRouter();
    const [isSubmitting, setSubmittingState] = useState(false);
    const [isRedirecting, setRedirectingState] = useState(false);
    const [socialProviders, setSocialProviders] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        planSlug: initialPlanSlug || '',
        termsAccepted: false,
        twoFactorEnabled: false
    });

    useEffect(() => {
        (async () => {
            const providers = await getProviders();
            const providersList = [];
            if (providers) {
                const { email, credentials, ...others } = providers;
                for (const provider in others) {
                    providersList.push(others[provider]);
                }
            }
            setSocialProviders([...providersList]);
        })();
    }, []);

    useEffect(() => {
        if (!router.isReady) return;
        const raw = router.query?.plan;
        const normalized = String(Array.isArray(raw) ? raw[0] : raw || '')
            .trim()
            .toUpperCase();
        if (!normalized) return;
        setFormData((prev) => {
            if (prev.planSlug === normalized) return prev;
            return { ...prev, planSlug: normalized };
        });
    }, [router.isReady, router.query?.plan]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setSubmittingState(true);

        const normalizedSlug = String(formData.planSlug || '').trim().toUpperCase();
        const selectedPlan = (plans || []).find((p) => String(p?.slug || '').toUpperCase() === normalizedSlug) || null;
        const planPriceId = selectedPlan?.stripePriceId ? String(selectedPlan.stripePriceId) : null;

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            setSubmittingState(false);
            return;
        }

        if (!formData.termsAccepted) {
            toast.error('Você precisa aceitar os Termos de Uso');
            setSubmittingState(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    termsAccepted: true,
                    planPriceId,
                    twoFactorEnabled: formData.twoFactorEnabled
                }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data?.data?.sessionId) {
                    setRedirectingState(true);
                    toast.success('Cadastro realizado! Redirecionando para o pagamento seguro...');
                    await redirectToCheckout(data.data.sessionId);
                    return;
                }

                toast.success(data.message || 'Cadastro realizado. Verifique seu e-mail para ativar a conta.');
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    planSlug: '',
                    termsAccepted: false,
                    twoFactorEnabled: false
                });

                if (data?.data?.sessionId) {
                    (async () => redirectToCheckout(data.data.sessionId))();
                    return;
                } else {
                    router.push('/auth/login?registered=true');
                }
            } else {
                toast.error(data?.error?.msg || 'An error occurred while registering');
            }
        } catch (err) {
            toast.error('Failed to connect to server');
        } finally {
            setSubmittingState(false);
        }
    };

    const signInWithSocial = (socialId) => {
        signIn(socialId, { callbackUrl: '/account' });
    };

    const normalizedSlug = String(formData.planSlug || '').trim().toUpperCase();
    const selectedPlan = (plans || []).find((p) => String(p?.slug || '').toUpperCase() === normalizedSlug) || null;
    const isPaidPlan = selectedPlan ? Number(selectedPlan.price) > 0 : false;

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-white overflow-hidden">
            <Meta title="Closify - Register" description="Create a new account on Closify." />
            <Toaster position="bottom-center" />

            {isRedirecting && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="relative mb-8">
                        <div className="h-24 w-24 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img src="/images/logo-symbol.png" alt="Closify" className="h-10 w-auto" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Quase lá!</h2>
                    <p className="text-gray-500 font-medium">Redirecionando você para o checkout seguro do Stripe...</p>
                </div>
            )}

            {/* Left side: Content & Branding */}
            <div className="hidden lg:flex lg:w-2/5 bg-[#0a0a0b] flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[100px]" />

                <div className="relative z-10">
                    <Link href="/">
                        <img src="/images/logo-full.png" alt="Closify Logo" className="h-10 w-auto brightness-[100] mb-16 cursor-pointer" style={{ filter: 'brightness(0) invert(1)' }} />
                    </Link>

                    <div className="space-y-8">
                        <h2 className="text-5xl font-extrabold text-white leading-tight">
                            Comece sua jornada <br /> com o <span className="text-emerald-400">Closify CRM</span>
                        </h2>
                        <ul className="space-y-5">
                            {[
                                "Acesso total à plataforma (14 dias grátis)",
                                "Inbox Omnichannel ilimitado",
                                "IA para transcrição e resumos",
                                "Form Builder e réguas No-code"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center text-gray-400 text-lg">
                                    <svg className="h-6 w-6 text-emerald-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5">
                        <p className="text-gray-400 italic mb-4">&quot;O Closify mudou a forma como encaramos nosso pipeline. A agilidade que ganhamos no dia a dia é impressionante.&quot;</p>
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 mr-3" />
                            <div>
                                <p className="text-white font-bold text-sm">Mariana Rocha</p>
                                <p className="text-gray-500 text-xs text-uppercase tracking-wider">COO @ FastGrowth</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Register form */}
            <div className="w-full lg:w-3/5 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-gray-50 lg:bg-white overflow-y-auto">
                <div className="w-full max-w-xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:hidden text-center mb-8">
                        <img src="/images/logo-full.png" alt="Closify Logo" className="h-8 w-auto mx-auto mb-4" />
                    </div>

                    <div className="text-left">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Criar sua conta</h1>
                        <p className="text-gray-500 text-lg">Junte-se a mais de 2.000 empresas que vendem melhor.</p>
                    </div>

                    {socialProviders.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {socialProviders.map((provider) => (
                                <button
                                    key={provider.id}
                                    type="button"
                                    onClick={() => signInWithSocial(provider.id)}
                                    className="flex items-center justify-center px-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all group border-b-4 border-b-gray-100 hover:border-b-gray-200"
                                >
                                    {provider.id === 'google' && (
                                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    )}
                                    <span className="text-sm font-bold text-gray-700 tracking-tight">Google</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="px-3 bg-white lg:bg-white text-gray-400 font-bold tracking-widest">OU CADASTRO MANUAL</span></div>
                    </div>

                    <form className="space-y-6" onSubmit={handleRegister}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="name">Nome completo</label>
                                <input
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition shadow-inner placeholder:text-gray-400"
                                    name="name"
                                    id="name"
                                    type="text"
                                    placeholder="Ex: João Silva"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="email">Email profissional</label>
                                <input
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition shadow-inner placeholder:text-gray-400"
                                    name="email"
                                    id="email"
                                    type="email"
                                    placeholder="joao@empresa.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="password">Senha segura</label>
                                <input
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition shadow-inner placeholder:text-gray-400"
                                    name="password"
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="confirmPassword">Confirmar senha</label>
                                <input
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition shadow-inner placeholder:text-gray-400"
                                    name="confirmPassword"
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="planSlug">Plano selecionado</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition shadow-inner appearance-none font-semibold text-gray-700"
                                    name="planSlug"
                                    id="planSlug"
                                    value={formData.planSlug}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Plano Free</option>
                                    {(plans || [])
                                        .filter((p) => Boolean(p?.isActive))
                                        .filter((p) => String(p?.slug || '').toUpperCase() !== 'FREE')
                                        .sort((a, b) => Number(a.price) - Number(b.price))
                                        .map((plan) => (
                                            <option key={plan.id} value={String(plan.slug || '').toUpperCase()}>
                                                {plan.name} — {plan.currency} {plan.price}/{plan.interval === 'month' ? 'mês' : 'ano'}
                                            </option>
                                        ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 ml-1">
                                Para garantir a segurança da plataforma e validar sua identidade, é necessário cadastrar um cartão (Stripe), mesmo no plano gratuito.
                            </p>
                        </div>

                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-4">
                            <label className="flex items-start group cursor-pointer">
                                <div className="relative flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        name="twoFactorEnabled"
                                        checked={formData.twoFactorEnabled}
                                        onChange={handleInputChange}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-emerald-600 checked:bg-emerald-600 transition-all"
                                    />
                                    <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="ml-3 select-none">
                                    <span className="block text-sm font-bold text-gray-900">Ativar Autenticação de Dois Fatores (2FA)</span>
                                    <span className="block text-xs text-gray-500">Aumente a segurança da sua conta agora. Recomendado.</span>
                                </div>
                            </label>

                            <label className="flex items-start group cursor-pointer">
                                <div className="relative flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        name="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={handleInputChange}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-emerald-600 checked:bg-emerald-600 transition-all"
                                        required
                                    />
                                    <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                                    Eu li e aceito os{' '}
                                    <Link href="/terms" className="font-bold text-emerald-600 hover:text-emerald-500" target="_blank">
                                        Termos de Uso
                                    </Link>
                                </span>
                            </label>
                        </div>

                        <Button
                            className="w-full py-4.5 justify-center bg-gray-900 hover:bg-black text-white rounded-2xl shadow-xl transition-all font-black text-lg active:scale-[0.98]"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Processando cadastro...' : (isPaidPlan ? 'Assinar e Criar minha conta' : 'Criar minha conta gratuita')}
                        </Button>
                    </form>

                    <div className="pt-8 text-center border-t border-gray-100 w-full mt-10">
                        <p className="text-gray-600 font-medium">
                            Já possui uma conta?{' '}
                            <Link href="/auth/login" className="font-black text-emerald-600 hover:text-emerald-500 transition-colors uppercase tracking-widest text-sm ml-2">
                                Fazer Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

export const getServerSideProps = async (context) => {
    const rawPlan = context?.query?.plan;
    const normalizedPlan = String(Array.isArray(rawPlan) ? rawPlan[0] : rawPlan || '')
        .trim()
        .toUpperCase();
    const initialPlanSlug = ['FREE', 'STANDARD', 'PREMIUM'].includes(normalizedPlan) ? normalizedPlan : '';

    try {
        const plans = await getAllPlans();
        const safePlans = (plans || []).map((plan) => ({
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            description: plan.description ?? null,
            price: plan.price,
            currency: plan.currency,
            interval: plan.interval,
            stripePriceId: plan.stripePriceId ?? null,
            features: plan.features ?? null,
            isActive: Boolean(plan.isActive),
        }));
        return { props: { plans: safePlans, initialPlanSlug } };
    } catch (error) {
        return { props: { plans: [], initialPlanSlug } };
    }
};
