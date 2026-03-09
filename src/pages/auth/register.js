import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Meta from '@/components/Meta/index';
import { AuthLayout } from '@/layouts/index';

const Register = () => {
    const router = useRouter();
    const [isSubmitting, setSubmittingState] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Registration successful. Please verify your email.');
                // router.push('/auth/login?registered=true');
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
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
                title="Nextacular - Register"
                description="Create a new account on Nextacular."
            />
            <div className="flex flex-col items-center justify-center p-5 m-auto space-y-5 rounded shadow-lg md:p-10 md:w-1/3 glass shadow-premium rounded-2xl">
                <div className="mb-4 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="mt-2 text-gray-500">Sign up to get started with Nextacular</p>
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
