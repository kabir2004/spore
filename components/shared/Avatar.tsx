import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
    name: string;
    size?: number;
    className?: string;
}

const COLORS = [
    'var(--accent-red)',
    'var(--accent-orange)',
    'var(--accent-green)',
    'var(--accent-blue)',
    'var(--accent-purple)',
    'var(--accent-pink)',
];

export function Avatar({ name, size = 28, className }: AvatarProps) {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % COLORS.length;
        return COLORS[index];
    };

    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-full text-white font-semibold',
                className
            )}
            style={{
                width: size,
                height: size,
                backgroundColor: getColor(name),
                fontSize: size * 0.42,
            }}
        >
            {getInitials(name)}
        </div>
    );
}
