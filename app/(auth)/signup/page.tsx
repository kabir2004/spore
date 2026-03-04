'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/Button';
import { AppLogo } from '@/components/shared/AppLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthErrorAlert, AuthSuccessAlert } from '@/components/auth/AuthErrorAlert';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { signUp, signInWithGoogle, signInWithMicrosoft } from '@/lib/actions/auth';

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const passwordHint =
        password.length > 0 && password.length < MIN_PASSWORD_LENGTH
            ? `At least ${MIN_PASSWORD_LENGTH} characters`
            : undefined;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError('Please enter your email address.');
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        setLoading(true);
        const result = await signUp(trimmedEmail, password, trimmedName || (trimmedEmail.split('@')[0] ?? ''));
        setLoading(false);

        if (result && 'error' in result) {
            setError(result.error);
            return;
        }
        if (result && 'needToConfirmEmail' in result) {
            setSuccessMessage(result.message ?? 'Check your email to confirm your account.');
            return;
        }
        // Otherwise redirect() was called
    };

    const handleGoogle = async () => {
        setError('');
        setSuccessMessage('');
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
        setSuccessMessage('');
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
                Create your account
            </h1>
            <p className="text-[14px] text-text-secondary mb-6">
                Get your workspace ready in a few seconds.
            </p>

            {error && (
                <div className="w-full mb-4">
                    <AuthErrorAlert message={error} />
                </div>
            )}
            {successMessage && (
                <div className="w-full mb-4">
                    <AuthSuccessAlert message={successMessage} />
                </div>
            )}

            <form onSubmit={handleSignup} className="w-full flex flex-col gap-4 mb-2">
                <AuthInput
                    label="Full name"
                    type="text"
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    disabled={loading}
                />
                <AuthInput
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                />
                <AuthInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    hint={passwordHint}
                    required
                    disabled={loading}
                    minLength={MIN_PASSWORD_LENGTH}
                />
                <Button
                    type="submit"
                    className="w-full h-11 rounded-lg text-[14px] font-semibold mt-1"
                    disabled={loading}
                >
                    {loading ? 'Creating account…' : 'Create account'}
                </Button>
            </form>

            <SocialAuthButtons
                mode="signup"
                onGoogle={handleGoogle}
                onMicrosoft={handleMicrosoft}
                disabled={loading}
            />

            <p className="mt-8 text-center text-[13px] text-text-muted">
                Already have an account?{' '}
                <Link href="/login" className="text-accent-blue hover:underline font-medium">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
