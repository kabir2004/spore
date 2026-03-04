'use client';

import { cn } from '@/lib/utils';

interface AuthErrorAlertProps {
    message: string;
    className?: string;
}

export function AuthErrorAlert({ message, className }: AuthErrorAlertProps) {
    return (
        <div
            role="alert"
            className={cn(
                'w-full px-4 py-3 rounded-lg border text-[13px]',
                'bg-accent-red-soft border-accent-red/30 text-accent-red',
                className
            )}
        >
            {message}
        </div>
    );
}

interface AuthSuccessAlertProps {
    message: string;
    className?: string;
}

export function AuthSuccessAlert({ message, className }: AuthSuccessAlertProps) {
    return (
        <div
            role="status"
            className={cn(
                'w-full px-4 py-3 rounded-lg border text-[13px]',
                'bg-accent-green-soft border-accent-green/30 text-accent-green',
                className
            )}
        >
            {message}
        </div>
    );
}
