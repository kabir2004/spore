'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Inbox, Calendar, Video, Search, FileSignature, MessageSquare, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/context/workspaceContext';

interface TooltipState {
    label: string;
    badge?: number;
    x: number; // viewport X right edge of the item
    y: number; // viewport Y center of the item
}

interface CollapsedNavRailProps {
    onExpand: () => void;
}

/**
 * Compact icon-only sidebar rail shown when the workspace sidebar is collapsed.
 * Renders all primary nav items as icon buttons with fixed-position tooltips so
 * they escape the overflow:hidden container and appear flush to the icon.
 */
export function CollapsedNavRail({ onExpand }: CollapsedNavRailProps) {
    const { slug } = useWorkspace();
    const pathname = usePathname();
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const isActive = (href: string) =>
        href === `/${slug}` ? pathname === `/${slug}` : pathname.startsWith(href);

    const navItems = [
        { label: 'Home',     icon: Home,          href: `/${slug}` },
        { label: 'Inbox',    icon: Inbox,         href: `/${slug}/inbox`,    badge: 3 },
        { label: 'Calendar', icon: Calendar,      href: `/${slug}/calendar` },
        { label: 'Meetings', icon: Video,         href: `/${slug}/meetings` },
        { label: 'Sign',     icon: FileSignature, href: `/${slug}/sign` },
        { label: 'Assistant', icon: MessageSquare,          href: `/${slug}/assistant` },
    ] as const;

    const showTooltip = (e: React.MouseEvent, label: string, badge?: number) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ label, badge, x: rect.right, y: rect.top + rect.height / 2 });
    };
    const hideTooltip = () => setTooltip(null);

    return (
        <>
            <aside className="w-10 h-screen flex flex-col items-center py-2 bg-bg-secondary border-r border-border-default">

                {/* Expand toggle */}
                <button
                    type="button"
                    onClick={onExpand}
                    onMouseEnter={(e) => showTooltip(e, 'Expand sidebar')}
                    onMouseLeave={hideTooltip}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    aria-label="Expand sidebar"
                >
                    <PanelLeft size={16} />
                </button>

                <div className="w-5 my-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />

                {/* Search */}
                <button
                    type="button"
                    onClick={() =>
                        window.dispatchEvent(
                            new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                        )
                    }
                    onMouseEnter={(e) => showTooltip(e, 'Search  ⌘K')}
                    onMouseLeave={hideTooltip}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    aria-label="Search"
                >
                    <Search size={16} />
                </button>

                <div className="w-5 my-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />

                {/* Nav items */}
                <div className="flex flex-col gap-0.5">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onMouseEnter={(e) => showTooltip(e, item.label, 'badge' in item ? item.badge : undefined)}
                                onMouseLeave={hideTooltip}
                                className={cn(
                                    'relative flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                                    active
                                        ? 'bg-bg-active text-text-primary'
                                        : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                                )}
                                aria-label={item.label}
                            >
                                <item.icon size={16} />
                                {'badge' in item && item.badge && (
                                    <span
                                        className="absolute flex items-center justify-center rounded-full font-bold tabular-nums"
                                        style={{
                                            top: 1, right: 1,
                                            width: 13, height: 13,
                                            fontSize: 8,
                                            background: '#2383E2',
                                            color: 'white',
                                            border: '1.5px solid var(--color-bg-secondary, #F7F7F5)',
                                        }}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </aside>

            {/* Fixed-position tooltip — escapes the overflow:hidden rail */}
            {tooltip && (
                <div
                    className="pointer-events-none select-none"
                    style={{
                        position: 'fixed',
                        left: tooltip.x + 8,
                        top: tooltip.y,
                        transform: 'translateY(-50%)',
                        zIndex: 9999,
                    }}
                >
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium shadow-lg"
                        style={{ background: '#1A1A1A', color: 'white', whiteSpace: 'nowrap' }}
                    >
                        {/* Left-pointing arrow */}
                        <div
                            style={{
                                position: 'absolute',
                                right: '100%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 0, height: 0,
                                borderTop: '5px solid transparent',
                                borderBottom: '5px solid transparent',
                                borderRight: '6px solid #1A1A1A',
                            }}
                        />
                        {tooltip.label}
                        {tooltip.badge && (
                            <span
                                className="flex items-center justify-center rounded-full font-bold tabular-nums"
                                style={{
                                    width: 16, height: 16,
                                    fontSize: 9,
                                    background: '#2383E2',
                                    color: 'white',
                                }}
                            >
                                {tooltip.badge}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
