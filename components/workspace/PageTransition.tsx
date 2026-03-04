'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wraps workspace page content so each route change gets a subtle fade-in.
 * Keying by pathname forces a fresh mount and runs the enter animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div key={pathname} className="page-content-enter min-h-full">
            {children}
        </div>
    );
}
