'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/shared/Button';
import { AppLogo } from '@/components/shared/AppLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { signIn, signInWithGoogle, signInWithMicrosoft } from '@/lib/actions/auth';

const ERROR_MAP: Record<string, string> = {
    missing_code: 'Sign-in was cancelled or the link expired. Please try again.',
    auth_failed: 'We couldn’t sign you in. Please try again.',
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const err = searchParams.get('error');
        if (err && ERROR_MAP[err]) setError(ERROR_MAP[err]);
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await signIn(email.trim().toLowerCase(), password);
        if (result && 'error' in result) {
            setError(result.error);
            setLoading(false);
            return;
        }
        // On success, signIn() calls redirect() server-side; loading stays true until navigation
        setLoading(false);
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        const result = await signInWithGoogle();
        if ('error' in result) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push(result.url);
        }
    };

    const handleMicrosoft = async () => {
        setError('');
        setLoading(true);
        const result = await signInWithMicrosoft();
        if ('error' in result) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push(result.url);
        }
    };

    return (
        <div className="w-full max-w-[400px] flex flex-col items-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-bg-elevated border border-border-default mb-6 overflow-hidden shadow-sm">
                <AppLogo size={40} className="object-contain" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
                Welcome back
            </h1>
            <p className="text-[14px] text-text-secondary mb-6">
                Sign in to your spore workspace.
            </p>

            {error && (
                <div className="w-full mb-4">
                    <AuthErrorAlert message={error} />
                </div>
            )}

            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4 mb-2">
                <AuthInput
                    label="Email address"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                />
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="auth-password" className="text-[13px] font-medium text-text-secondary">
                            Password
                        </label>
                        <Link
                            href="/forgot-password"
                            className="text-[12px] text-accent-blue hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <input
                        id="auth-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="h-11 px-3 rounded-lg border border-border-default hover:border-text-placeholder focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue bg-bg-primary text-[14px] outline-none transition-colors placeholder:text-text-placeholder"
                    />
                </div>
                <Button
                    type="submit"
                    className="w-full h-11 rounded-lg text-[14px] font-semibold mt-1"
                    disabled={loading}
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </Button>
            </form>

            <SocialAuthButtons
                mode="login"
                onGoogle={handleGoogle}
                onMicrosoft={handleMicrosoft}
                disabled={loading}
            />

            <p className="mt-8 text-center text-[13px] text-text-muted">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-accent-blue hover:underline font-medium">
                    Create account
                </Link>
            </p>
        </div>
    );
}

function LoginFallback() {
    return (
        <div className="w-full max-w-[400px] flex flex-col items-center animate-pulse">
            <div className="w-14 h-14 rounded-xl bg-bg-elevated border border-border-default mb-6" />
            <div className="h-8 w-48 bg-bg-hover rounded mb-2" />
            <div className="h-4 w-64 bg-bg-hover rounded mb-6" />
            <div className="w-full h-11 bg-bg-hover rounded-lg mb-4" />
            <div className="w-full h-11 bg-bg-hover rounded-lg" />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <LoginForm />
        </Suspense>
    );
}
