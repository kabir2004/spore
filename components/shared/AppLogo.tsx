'use client';

import React from 'react';
import { useTheme } from '@/lib/context/themeContext';
import { cn } from '@/lib/utils';

interface AppLogoProps {
    size?: number;
    className?: string;
}

/**
 * spore app logo — correct icon per theme:
 * - Light theme → sporelighticon.png (black icon, for light backgrounds)
 * - Dark theme  → sporedarkicon.png  (white icon, for dark backgrounds)
 */
export function AppLogo({ size = 24, className }: AppLogoProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const src = isDark ? '/sporedarkicon.png' : '/sporelighticon.png';

    return (
        <img
            src={src}
            alt="spore"
            width={size}
            height={size}
            className={cn('shrink-0 object-contain', className)}
            style={{ width: size, height: size }}
        />
    );
}
