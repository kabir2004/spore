'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    Inbox,
    Calendar,
    Video,
    Search,
    FileSignature,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../shared/Badge';
import { useWorkspace } from '@/lib/context/workspaceContext';

export function SidebarNav() {
    const { slug } = useWorkspace();
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === `/${slug}`) return pathname === `/${slug}`;
        return pathname.startsWith(href);
    };

    const navItems = [
        { label: 'Home', icon: Home, href: `/${slug}` },
        { label: 'Inbox', icon: Inbox, href: `/${slug}/inbox`, badge: 3 },
        { label: 'Calendar', icon: Calendar, href: `/${slug}/calendar` },
        { label: 'Meetings', icon: Video, href: `/${slug}/meetings` },
        { label: 'Sign', icon: FileSignature, href: `/${slug}/sign` },
        { label: 'Assistant', icon: MessageSquare, href: `/${slug}/assistant` },
    ];

    const handleSearch = () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    };

    return (
        <nav className="flex flex-col gap-[2px]">
            {/* Search — opens command palette */}
            <button
                onClick={handleSearch}
                className="group flex items-center justify-between rounded-md px-[10px] py-[5px] text-text-secondary hover:bg-bg-hover transition-colors font-medium w-full text-left"
            >
                <div className="flex items-center gap-2">
                    <div className="w-[22px] flex items-center justify-center">
                        <Search size={16} className="text-text-muted group-hover:text-text-secondary" />
                    </div>
                    <span>Search</span>
                </div>
                <span className="text-[11px] text-text-placeholder">⌘K</span>
            </button>

            {/* Nav links */}
            {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            'group flex items-center justify-between rounded-md px-[10px] py-[5px] transition-colors font-medium',
                            active
                                ? 'bg-bg-active text-text-primary'
                                : 'text-text-secondary hover:bg-bg-hover'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-[22px] flex items-center justify-center">
                                <item.icon
                                    size={16}
                                    className={cn(
                                        active ? 'text-text-secondary' : 'text-text-muted group-hover:text-text-secondary'
                                    )}
                                />
                            </div>
                            <span>{item.label}</span>
                        </div>
                        {item.badge && <Badge>{item.badge}</Badge>}
                    </Link>
                );
            })}
        </nav>
    );
}
