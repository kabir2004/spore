'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureWorkspaceForCurrentUser } from '@/lib/actions/auth';
import { AppLogo } from '@/components/shared/AppLogo';

/**
 * Email confirmation landing page.
 * Supabase redirects here after the user clicks the link in the confirmation email,
 * with access_token and refresh_token in the URL hash. We set the session, ensure
 * they have a workspace, then redirect into the app.
 */
export default function AuthConfirmPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let mounted = true;

        async function handleConfirm() {
            const hash = window.location.hash?.slice(1);
            if (!hash) {
                setStatus('error');
                setMessage('Invalid confirmation link.');
                return;
            }

            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (!access_token || !refresh_token) {
                setStatus('error');
                setMessage('Invalid confirmation link. Tokens missing.');
                return;
            }

            const supabase = createClient();
            const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });

            if (sessionError || !mounted) {
                if (mounted) {
                    setStatus('error');
                    setMessage(sessionError?.message ?? 'Could not sign you in.');
                }
                return;
            }

            const result = await ensureWorkspaceForCurrentUser();
            if (!mounted) return;

            if ('error' in result) {
                setStatus('error');
                setMessage(result.error);
                return;
            }

            setStatus('success');
            window.location.replace(`/${result.slug}`);
        }

        handleConfirm();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="w-full max-w-[400px] flex flex-col items-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-bg-elevated border border-border-default mb-6 overflow-hidden shadow-sm">
                <AppLogo size={40} className="object-contain" />
            </div>

            {status === 'loading' && (
                <>
                    <h1 className="text-xl font-semibold text-text-primary mb-2">
                        Confirming your email…
                    </h1>
                    <p className="text-[14px] text-text-secondary">
                        Taking you to your workspace.
                    </p>
                </>
            )}

            {status === 'success' && (
                <>
                    <h1 className="text-xl font-semibold text-text-primary mb-2">
                        You’re in
                    </h1>
                    <p className="text-[14px] text-text-secondary">
                        Redirecting to your workspace…
                    </p>
                </>
            )}

            {status === 'error' && (
                <>
                    <h1 className="text-xl font-semibold text-text-primary mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-[14px] text-text-secondary text-center mb-4">
                        {message}
                    </p>
                    <a
                        href="/login"
                        className="text-[14px] text-accent-blue hover:underline font-medium"
                    >
                        Back to sign in
                    </a>
                </>
            )}
        </div>
    );
}
