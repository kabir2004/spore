'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { ArrowUpRight, Search, Plus, Calendar, Users, FileText } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { IBlock } from '@/lib/types/block';
import { AppLogo } from '@/components/shared/AppLogo';

const DynamicIcon = ({ name, size = 16, className }: { name: string; size?: number; className?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[name as keyof typeof LucideIcons];
    if (!IconComponent) return <LucideIcons.FileText size={size} className={className} />;
    return <IconComponent size={size} className={className} />;
};

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

/** Strip HTML tags and decode common HTML entities for safe plain-text preview */
function stripHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

const MOCK_MEETINGS = [
    { id: 'm1', title: 'Design Sync', time: '10:00 AM', duration: '30 min', color: 'var(--accent-blue)' },
    { id: 'm2', title: 'Engineering Standup', time: '11:30 AM', duration: '15 min', color: 'var(--accent-green)' },
    { id: 'm3', title: 'Product Review', time: '2:00 PM', duration: '1 hr', color: 'var(--accent-purple)' },
];

const MOCK_INBOX = [
    { id: 'e1', from: 'Alex Chen', subject: 'Re: Q3 Roadmap Review', unread: true },
    { id: 'e2', from: 'Sarah Kim', subject: 'Design tokens update', unread: true },
    { id: 'e3', from: 'Marcus Li', subject: 'Weekly engineering digest', unread: false },
];

const isEmoji = (icon: string) => icon.length > 0 && !/^[A-Za-z]/.test(icon);

interface HomePageProps {
    workspaceSlug: string;
}

export function HomePage({ workspaceSlug }: HomePageProps) {
    const router = useRouter();
    const blocks = useWorkspaceStore((state) => state.blocks);
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const addBlock = useWorkspaceStore((state) => state.addBlock);
    const updateBlock = useWorkspaceStore((state) => state.updateBlock);

    const now = new Date();
    const rootId = workspaces[workspaceSlug]?.rootId ?? 'workspace-root';
    const workspaceName = workspaces[workspaceSlug]?.name ?? `${workspaceSlug}'s Workspace`;
    const userName = workspaceName.replace(/'s Workspace$/, '').replace(/\s+Workspace$/, '').trim();

    const topLevelPages = useMemo(() => {
        const root = blocks[rootId];
        if (!root) return [];
        return root.content
            .map((id) => blocks[id])
            .filter(Boolean)
            .filter((b) => b.type === 'page') as IBlock[];
    }, [blocks, rootId]);

    /** Recently edited pages (excluding workspace root), with a plain-text content preview */
    const recentPages = useMemo(() => {
        return Object.values(blocks)
            .filter((b) => b.type === 'page' && b.id !== rootId && b.parent_id !== null)
            .sort((a, b) => b.last_edited_time - a.last_edited_time)
            .slice(0, 6)
            .map((page) => {
                // First non-page child block that has text or code
                const firstContent = page.content
                    .map((id) => blocks[id])
                    .filter((b): b is IBlock => !!b && b.type !== 'page')
                    .find((b) => b.properties.text || b.properties.code);

                const rawPreview =
                    firstContent?.properties.text ||
                    firstContent?.properties.code ||
                    '';

                const preview = stripHtml(rawPreview).slice(0, 120);

                return { page, preview };
            });
    }, [blocks, rootId]);

    const handleNewPage = () => {
        const newId = `page-${Date.now()}`;
        addBlock({
            id: newId,
            type: 'page',
            properties: { title: 'Untitled', icon: 'FileText' },
            content: [],
            parent_id: rootId,
            created_time: Date.now(),
            last_edited_time: Date.now(),
        });
        const root = blocks[rootId];
        if (root) {
            updateBlock(rootId, { content: [...root.content, newId] });
        }
        router.push(`/${workspaceSlug}/${newId}`);
    };

    return (
        <div className="w-full min-w-0 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 md:py-10">
            {/* Greeting + logo */}
            <div className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-bg-elevated border border-border-default shrink-0 overflow-hidden">
                    <AppLogo size={24} className="sm:w-7 sm:h-7 object-contain" />
                </div>
                <div className="min-w-0">
                    <h1
                        className="text-xl sm:text-2xl md:text-[28px] font-semibold text-text-primary tracking-[-0.3px] truncate"
                        suppressHydrationWarning
                    >
                        {getGreeting()}, {userName}.
                    </h1>
                    <p
                        className="mt-0.5 text-[11px] sm:text-[12.5px] text-text-placeholder uppercase tracking-wider"
                        suppressHydrationWarning
                    >
                        {formatDate(now)}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-8 sm:mb-10">
                <button
                    onClick={handleNewPage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-bg-secondary border border-border-default text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors shrink-0"
                >
                    <Plus size={14} />
                    <span>New page</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-bg-secondary border border-border-default text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors shrink-0">
                    <Search size={14} />
                    <span>Search</span>
                    <kbd className="ml-1 text-[11px] text-text-placeholder bg-bg-hover border border-border-light rounded px-1 py-0.5 leading-none hidden sm:inline">
                        ⌘K
                    </kbd>
                </button>
                <Link
                    href={`/${workspaceSlug}/calendar`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-bg-secondary border border-border-default text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                    <Calendar size={14} />
                    <span>Calendar</span>
                </Link>
                <Link
                    href={`/${workspaceSlug}/meetings`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-bg-secondary border border-border-default text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                    <Users size={14} />
                    <span>Meetings</span>
                </Link>
            </div>

            {/* Jump Back In */}
            <div className="mb-8 sm:mb-10">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3 text-left">
                    Jump back in
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 sm:gap-3">
                    {topLevelPages.map((page) => (
                        <Link
                            key={page.id}
                            href={`/${workspaceSlug}/${page.id}`}
                            className="group flex flex-col gap-2 p-3 sm:p-3.5 rounded-[8px] border border-border-default bg-bg-primary hover:bg-bg-hover hover:shadow-sm transition-all min-w-0"
                        >
                            <div className="text-text-secondary group-hover:text-text-primary transition-colors shrink-0">
                                {page.properties.icon && isEmoji(page.properties.icon) ? (
                                    <span className="text-base sm:text-[18px] leading-none">{page.properties.icon}</span>
                                ) : (
                                    <DynamicIcon name={page.properties.icon || 'FileText'} size={18} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] sm:text-[13.5px] font-semibold text-text-primary leading-tight truncate">
                                    {page.properties.title || 'Untitled'}
                                </p>
                                <p className="text-[11px] sm:text-[11.5px] text-text-placeholder mt-0.5">
                                    {page.content.length} {page.content.length === 1 ? 'block' : 'blocks'}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Two-column layout — stacks on small screens */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(260px,320px)] gap-8 lg:gap-10 min-w-0">
                {/* Left: Recent Pages */}
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3 text-left">
                        Recent pages
                    </p>
                    <div className="flex flex-col">
                        {recentPages.length === 0 ? (
                            <p className="text-[13px] text-text-placeholder py-2">No pages yet.</p>
                        ) : (
                            recentPages.map(({ page, preview }) => (
                                <Link
                                    key={page.id}
                                    href={`/${workspaceSlug}/${page.id}`}
                                    className="group flex items-start gap-3 py-2.5 px-2 sm:px-3 rounded-[6px] hover:bg-bg-hover transition-colors -mx-2 sm:-mx-3 min-w-0"
                                >
                                    <div className="w-7 h-7 rounded-md bg-bg-secondary border border-border-default flex items-center justify-center shrink-0 mt-0.5 text-text-muted flex-shrink-0">
                                        {page.properties.icon && isEmoji(page.properties.icon) ? (
                                            <span className="text-[15px] leading-none">{page.properties.icon}</span>
                                        ) : (
                                            <DynamicIcon name={page.properties.icon || 'FileText'} size={13} className="text-text-muted" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] sm:text-[13.5px] font-medium text-text-primary leading-tight truncate">
                                            {page.properties.title || 'Untitled'}
                                        </p>
                                        {preview && (
                                            <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2 sm:truncate">
                                                {preview}
                                            </p>
                                        )}
                                    </div>
                                    <ArrowUpRight
                                        size={14}
                                        className="shrink-0 text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0"
                                    />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Today Sidebar — fixed width on large */}
                <div className="flex flex-col gap-6 sm:gap-7 min-w-0 lg:min-w-[260px]">
                    {/* Today's Meetings */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left">
                                Today&apos;s meetings
                            </p>
                            <Link
                                href={`/${workspaceSlug}/meetings`}
                                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                            >
                                View all
                            </Link>
                        </div>
                        <div className="flex flex-col gap-2">
                            {MOCK_MEETINGS.map((meeting) => (
                                <div
                                    key={meeting.id}
                                    className="flex items-start gap-2.5 p-2.5 rounded-[6px] bg-bg-secondary border border-border-light min-w-0"
                                >
                                    <div
                                        className="w-0.5 min-h-[32px] sm:min-h-[36px] rounded-full shrink-0"
                                        style={{ backgroundColor: meeting.color }}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-text-primary leading-tight truncate">
                                            {meeting.title}
                                        </p>
                                        <p className="text-[11.5px] text-text-muted mt-0.5">
                                            {meeting.time} · {meeting.duration}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inbox */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left shrink-0">
                                    Inbox
                                </p>
                                <span className="text-[10px] font-semibold bg-accent-blue text-white rounded-full px-1.5 py-0.5 leading-none shrink-0">
                                    {MOCK_INBOX.filter((e) => e.unread).length}
                                </span>
                            </div>
                            <Link
                                href={`/${workspaceSlug}/inbox`}
                                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                            >
                                View all
                            </Link>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {MOCK_INBOX.map((email) => (
                                <div
                                    key={email.id}
                                    className="flex items-start gap-2.5 px-2.5 py-2 rounded-[6px] hover:bg-bg-hover transition-colors cursor-pointer min-w-0"
                                >
                                    <div
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 flex-shrink-0 ${
                                            email.unread ? 'bg-accent-blue' : 'bg-transparent'
                                        }`}
                                    />
                                    <div className="min-w-0">
                                        <p
                                            className={`text-[12px] sm:text-[12.5px] leading-tight truncate ${
                                                email.unread
                                                    ? 'font-semibold text-text-primary'
                                                    : 'text-text-secondary'
                                            }`}
                                        >
                                            {email.from}
                                        </p>
                                        <p className="text-[11px] sm:text-[12px] text-text-muted truncate mt-0.5">
                                            {email.subject}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
