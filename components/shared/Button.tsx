import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center transition-colors duration-150',
                    {
                        'bg-accent-blue text-white font-medium text-[13px] px-4 py-[7px] rounded-sm hover:bg-accent-blue-hover border-none':
                            variant === 'primary',
                        'bg-transparent text-text-muted font-medium text-[12.5px] px-3 py-[5px] rounded-full border border-border-default hover:border-accent-blue hover:text-accent-blue':
                            variant === 'secondary' || variant === 'ghost',
                        'bg-bg-primary text-text-primary px-4 py-2 border border-border-default hover:bg-bg-hover rounded-md':
                            variant === 'outline',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
