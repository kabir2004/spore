'use client';

import { useEffect } from 'react';
import { Button } from '@/components/shared/Button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 font-sans">
            <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
            <p className="text-text-secondary text-sm max-w-md text-center mb-6">
                {error.message || 'An unexpected error occurred.'}
            </p>
            <Button onClick={reset}>Try again</Button>
        </div>
    );
}
