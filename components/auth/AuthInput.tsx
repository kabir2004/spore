'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
    ({ label, error, hint, className, id: idProp, ...props }, ref) => {
        const id = idProp ?? `auth-${label.replace(/\s/g, '-').toLowerCase()}`;
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-[13px] font-medium text-text-secondary">
                    {label}
                </label>
                <input
                    ref={ref}
                    id={id}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                    className={cn(
                        'h-11 px-3 rounded-lg border bg-bg-primary text-[14px] outline-none transition-colors',
                        'placeholder:text-text-placeholder',
                        'focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue',
                        error
                            ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/30'
                            : 'border-border-default hover:border-text-placeholder',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p id={`${id}-error`} className="text-[12px] text-accent-red" role="alert">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${id}-hint`} className="text-[12px] text-text-muted">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);
AuthInput.displayName = 'AuthInput';
