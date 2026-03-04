import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    className?: string;
}

export function Badge({ children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center bg-accent-blue text-white font-bold',
                'px-[6px] py-[1px] text-[11px] rounded-[10px]',
                className
            )}
        >
            {children}
        </span>
    );
}
