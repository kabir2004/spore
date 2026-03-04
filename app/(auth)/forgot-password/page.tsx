'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/shared/Button';
import { AppLogo } from '@/components/shared/AppLogo';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthErrorAlert, AuthSuccessAlert } from '@/components/auth/AuthErrorAlert';
import { requestPasswordReset } from '@/lib/actions/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        const result = await requestPasswordReset(email);
        setLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-[400px] flex flex-col items-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-bg-elevated border border-border-default mb-6 overflow-hidden shadow-sm">
                    <AppLogo size={40} className="object-contain" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
                    Check your email
                </h1>
                <p className="text-[14px] text-text-secondary mb-6 text-center">
                    We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
                </p>
                <AuthSuccessAlert
                    message="If you don't see it, check your spam folder."
                    className="mb-6"
                />
                <Link href="/login" className="text-[14px] text-accent-blue hover:underline font-medium">
                    Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[400px] flex flex-col items-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-bg-elevated border border-border-default mb-6 overflow-hidden shadow-sm">
                <AppLogo size={40} className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
                Reset password
            </h1>
            <p className="text-[14px] text-text-secondary mb-6 text-center">
                Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
                <div className="w-full mb-4">
                    <AuthErrorAlert message={error} />
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
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
                <Button
                    type="submit"
                    className="w-full h-11 rounded-lg text-[14px] font-semibold"
                    disabled={loading}
                >
                    {loading ? 'Sending…' : 'Send reset link'}
                </Button>
            </form>

            <p className="mt-8 text-center text-[13px] text-text-muted">
                <Link href="/login" className="text-accent-blue hover:underline font-medium">
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}
