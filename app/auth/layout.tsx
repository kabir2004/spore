import React from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/shared/AppLogo';

export default function AuthRouteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary font-sans antialiased">
            <div
                className="fixed inset-0 -z-10 opacity-[0.4] dark:opacity-[0.08]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, var(--border-light) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--border-light) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px',
                }}
            />
            <header className="absolute top-0 w-full p-6 z-10">
                <Link
                    href="/"
                    className="flex items-center gap-2 select-none text-text-primary hover:opacity-90 transition-opacity w-fit"
                >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden bg-bg-elevated border border-border-default shrink-0">
                        <AppLogo size={28} className="object-contain" />
                    </div>
                    <span className="font-bold tracking-tight text-[18px]">aurora</span>
                </Link>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-0">
                {children}
            </main>
            <footer className="absolute bottom-0 w-full p-6 flex justify-center text-[12px] text-text-muted z-10 gap-4">
                <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
                <span aria-hidden>·</span>
                <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
                <span aria-hidden>·</span>
                <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
            </footer>
        </div>
    );
}
