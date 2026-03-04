'use client';

import React from 'react';
import { useTheme } from '@/lib/context/themeContext';
import { cn } from '@/lib/utils';

interface AppLogoProps {
    size?: number;
    className?: string;
}

/**
 * aurora app logo — correct icon per theme:
 * - Light theme → auroralighticon.png (black icon, for light backgrounds)
 * - Dark theme  → auroradarkicon.png  (white icon, for dark backgrounds)
 */
export function AppLogo({ size = 24, className }: AppLogoProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const src = isDark ? '/auroradarkicon.png' : '/auroralighticon.png';

    return (
        <img
            src={src}
            alt="aurora"
            width={size}
            height={size}
            className={cn('shrink-0 object-contain', className)}
            style={{ width: size, height: size }}
        />
    );
}
