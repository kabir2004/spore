'use client';

import Link from 'next/link';
import { AppLogo } from '@/components/shared/AppLogo';
import { Button } from '@/components/shared/Button';

export default function WelcomePage() {
    return (
        <div className="w-full max-w-[440px] flex flex-col items-center text-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-bg-elevated border border-border-default mb-8 overflow-hidden shadow-md">
                <AppLogo size={44} className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-3">
                Welcome to aurora
            </h1>
            <p className="text-[15px] text-text-secondary mb-10 leading-relaxed">
                Your workspace for notes, docs, and tasks. Get started in seconds.
            </p>

            <div className="w-full flex flex-col gap-3 mb-8">
                <Link href="/login" className="w-full">
                    <Button
                        type="button"
                        className="w-full h-12 rounded-lg text-[15px] font-semibold"
                    >
                        Sign in
                    </Button>
                </Link>
                <Link href="/signup" className="w-full">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 rounded-lg text-[15px] font-medium border border-border-default"
                    >
                        Create account
                    </Button>
                </Link>
            </div>

            <p className="text-[13px] text-text-muted">
                Or open <a href="/login" className="text-accent-blue hover:underline font-medium">Sign in</a> directly.
            </p>
            <p className="text-[13px] text-text-muted mt-4">
                By continuing, you agree to our{' '}
                <a href="#" className="text-accent-blue hover:underline">Terms</a>
                {' '}and{' '}
                <a href="#" className="text-accent-blue hover:underline">Privacy Policy</a>.
            </p>
        </div>
    );
}
