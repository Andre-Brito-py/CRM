import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/compat/router';
import toast, { Toaster } from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';

const ResetPassword = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    useEffect(() => {
        const qEmail = router?.query?.email;
        const qToken = router?.query?.token;

        const normalizedEmail = String(Array.isArray(qEmail) ? qEmail[0] : qEmail || '').trim().toLowerCase();
        const normalizedToken = String(Array.isArray(qToken) ? qToken[0] : qToken || '').trim();

        if (normalizedEmail) setEmail(normalizedEmail);
        if (normalizedToken) setToken(normalizedToken);
    }, [router]);

    const canSubmit = useMemo(() => {
        if (!email || !isEmail(email)) return false;
        if (!token || token.length < 32) return false;
        if (password.length < 10 || password.length > 72) return false;
        if (!/[A-Za-z]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        if (password !== confirmPassword) return false;
        return true;
    }, [email, token, password, confirmPassword]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        try {
            const resp = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, password }),
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(json?.error?.msg || 'Não foi possível redefinir a senha');
            }
            toast.success('Senha atualizada com sucesso. Você já pode entrar.');
            if (router) {
                router.push('/auth/login');
            } else if (typeof window !== 'undefined') {
                window.location.assign('/auth/login');
            }
        } catch (error) {
            toast.error(error?.message || 'Não foi possível redefinir a senha');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
            <Meta title="Closify | Redefinir senha" description="Redefina a senha da sua conta." />
            <Toaster position="bottom-center" toastOptions={{ duration: 10000 }} />

            <div className="w-full max-w-md bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-xl font-black tracking-tight text-gray-900">
                            Clos<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">ify</span>
                        </span>
                    </Link>
                    <h1 className="mt-6 text-2xl font-extrabold text-gray-900 tracking-tight">Redefinir senha</h1>
                    <p className="mt-2 text-gray-500">Crie uma nova senha para acessar sua conta.</p>
                </div>

                <form className="space-y-5" onSubmit={onSubmit}>
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
                        <label className="text-sm font-semibold text-gray-700">Nova senha</label>
                        <input
                            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm placeholder:text-gray-400"
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="mín. 10 caracteres com letras e números"
                            type="password"
                            value={password}
                            required
                        />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Confirmar nova senha</label>
                        <input
                            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition shadow-sm placeholder:text-gray-400"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="repita a senha"
                            type="password"
                            value={confirmPassword}
                            required
                        />
                    </div>

                    <Button
                        className="w-full py-4 justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold text-lg"
                        disabled={!canSubmit || isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
                    </Button>

                    <div className="text-center pt-2">
                        <Link href="/auth/login" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                            Voltar para o login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
