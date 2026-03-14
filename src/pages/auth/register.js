import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { AuthLayout } from '@/layouts/index';
import { redirectToCheckout } from '@/lib/client/stripe';
import { getAllPlans } from '@/prisma/services/plan';
import { getSystemConfig } from '@/lib/server/config';

const Register = ({ plans }) => {
    const router = useRouter();
    const [isSubmitting, setSubmittingState] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        planPriceId: '',
        termsAccepted: false,
    });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setSubmittingState(true);

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
                    planPriceId: formData.planPriceId || null,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Cadastro realizado. Verifique seu e-mail para ativar a conta.');
                // router.push('/auth/login?registered=true');
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    planPriceId: '',
                    termsAccepted: false,
                });

                if (data?.data?.sessionId) {
                    (async () => redirectToCheckout(data.data.sessionId))();
                    return;
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

    return (
        <AuthLayout>
            <Meta
                title="Closify - Register"
                description="Create a new account on Closify."
            />
            <div className="flex flex-col items-center justify-center p-5 m-auto space-y-5 rounded shadow-lg md:p-10 md:w-1/3 glass shadow-premium rounded-2xl">
                <div className="mb-4 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="mt-2 text-gray-500">Sign up to get started with Closify</p>
                </div>

                <form className="flex flex-col w-full space-y-4" onSubmit={handleRegister}>
                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="name">Full Name</label>
                        <input
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            name="name"
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="email">Email address</label>
                        <input
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            name="email"
                            id="email"
                            type="email"
                            placeholder="you@email.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="password">Password</label>
                        <input
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            name="password"
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            name="confirmPassword"
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="planPriceId">Plano</label>
                        <select
                            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                            name="planPriceId"
                            id="planPriceId"
                            value={formData.planPriceId}
                            onChange={handleInputChange}
                        >
                            <option value="">Gratuito (FREE)</option>
                            {(plans || [])
                                .filter((p) => Boolean(p?.stripePriceId))
                                .map((plan) => (
                                    <option key={plan.id} value={plan.stripePriceId}>
                                        {plan.name} ({plan.interval}) — {plan.currency} {plan.price}
                                    </option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            Ao selecionar um plano pago, será solicitado um cartão para cobrança recorrente.
                        </p>
                    </div>

                    <label className="flex items-start gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={formData.termsAccepted}
                            onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                            className="mt-1"
                            required
                        />
                        <span>
                            Eu li e aceito os{' '}
                            <Link href="/terms" className="font-semibold text-brand-600 hover:text-brand-500" target="_blank">
                                Termos de Uso
                            </Link>
                            .
                        </span>
                    </label>

                    <Button
                        className="w-full justify-center bg-brand-600 hover:bg-brand-700 text-white"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? 'Registering...' : 'Sign Up'}
                    </Button>
                </form>

                <div className="pt-4 text-center border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Register;

export const getServerSideProps = async () => {
    const paymentsSecretKey = await getSystemConfig('PAYMENTS_SECRET_KEY', process.env.PAYMENTS_SECRET_KEY);
    if (!paymentsSecretKey) {
        return { props: { plans: [] } };
    }

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
            createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
            updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : null,
        }));
        return { props: { plans: safePlans } };
    } catch (error) {
        return { props: { plans: [] } };
    }
};
