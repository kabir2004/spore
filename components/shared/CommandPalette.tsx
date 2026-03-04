'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { useWorkspace } from '@/lib/context/workspaceContext';

const DynamicIcon = ({ name }: { name: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[name as keyof typeof LucideIcons];
    if (!IconComponent) return <FileText size={15} className="text-text-muted" />;
    return <IconComponent size={15} className="text-text-muted" />;
};

interface ResultItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: string;
    href: string;
    category: string;
}

export function CommandPalette() {
    const { slug } = useWorkspace();
    const router = useRouter();
    const blocks = useWorkspaceStore(state => state.blocks);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(open => !open);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    // Build result list from store + static nav items
    const allResults = useMemo((): ResultItem[] => {
        const pages: ResultItem[] = Object.values(blocks)
            .filter(b => b.type === 'page' && b.id !== 'workspace-root')
            .map(b => {
                // Build parent path for subtitle
                let parentTitle = '';
                if (b.parent_id && b.parent_id !== 'workspace-root') {
                    const parent = blocks[b.parent_id];
                    if (parent) parentTitle = parent.properties.title || 'Untitled';
                }
                return {
                    id: b.id,
                    title: b.properties.title || 'Untitled',
                    subtitle: parentTitle ? `In ${parentTitle}` : undefined,
                    icon: b.properties.icon || 'FileText',
                    href: `/${slug}/${b.id}`,
                    category: 'Pages',
                };
            });

        const navItems: ResultItem[] = [
            { id: 'nav-home',     title: 'Home',     icon: 'Home',     href: `/${slug}`,           category: 'Navigation' },
            { id: 'nav-inbox',    title: 'Inbox',    icon: 'Inbox',    href: `/${slug}/inbox`,     category: 'Navigation' },
            { id: 'nav-calendar', title: 'Calendar', icon: 'Calendar', href: `/${slug}/calendar`,  category: 'Navigation' },
            { id: 'nav-meetings', title: 'Meetings', icon: 'Video',    href: `/${slug}/meetings`,  category: 'Navigation' },
        ];

        return [...pages, ...navItems];
    }, [blocks, slug]);

    const filtered = useMemo(() => {
        if (!query.trim()) return allResults;
        const q = query.toLowerCase();
        return allResults.filter(r =>
            r.title.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            (r.subtitle?.toLowerCase().includes(q) ?? false)
        );
    }, [allResults, query]);

    useEffect(() => { setSelectedIndex(0); }, [filtered]);

    // Scroll selected into view
    useEffect(() => {
        const selected = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
        selected?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const handleSelect = useCallback((item: ResultItem) => {
        router.push(item.href);
        setIsOpen(false);
        setQuery('');
    }, [router]);

    useEffect(() => {
        if (!isOpen) return;
        const handleNav = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
            if (e.key === 'Enter') {
                e.preventDefault();
                const item = filtered[selectedIndex];
                if (item) handleSelect(item);
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filtered, selectedIndex, handleSelect]);

    // Group by category for display
    const grouped = useMemo(() => {
        const map: Record<string, ResultItem[]> = {};
        for (const item of filtered) {
            if (!map[item.category]) map[item.category] = [];
            map[item.category].push(item);
        }
        return map;
    }, [filtered]);

    // Flat index for keyboard selection (must match grouped display order)
    const flatOrder = useMemo(() => filtered, [filtered]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center pt-[120px]">
            <div
                className="absolute inset-0 bg-black/25 backdrop-blur-[3px]"
                onClick={() => setIsOpen(false)}
            />
            <div className="relative w-full max-w-[560px] bg-bg-primary border border-border-default rounded-[12px] shadow-lg flex flex-col overflow-hidden max-h-[480px]">
                {/* Search input */}
                <div className="flex items-center px-4 py-3 border-b border-border-default gap-3 shrink-0">
                    <Search size={16} className="text-text-muted shrink-0" />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-text-placeholder text-text-primary"
                        placeholder="Search pages, inbox, calendar..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <kbd className="text-[11px] text-text-placeholder bg-bg-secondary border border-border-light rounded px-1.5 py-0.5 shrink-0">
                        esc
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-2">
                    {flatOrder.length === 0 ? (
                        <div className="py-10 text-center text-[13px] text-text-placeholder">
                            No results for &quot;{query}&quot;
                        </div>
                    ) : (
                        Object.entries(grouped).map(([category, items]) => (
                            <div key={category} className="mb-1">
                                <div className="px-2 py-1.5 text-[10.5px] font-semibold text-text-muted uppercase tracking-wider">
                                    {category}
                                </div>
                                {items.map(item => {
                                    const flatIdx = flatOrder.findIndex(r => r.id === item.id);
                                    const isSelected = selectedIndex === flatIdx;
                                    return (
                                        <div
                                            key={item.id}
                                            data-selected={isSelected}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2 rounded-[6px] cursor-pointer transition-colors',
                                                isSelected ? 'bg-bg-secondary' : 'hover:bg-bg-hover'
                                            )}
                                        >
                                            <DynamicIcon name={item.icon} />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[13.5px] font-medium text-text-primary block truncate">
                                                    {item.title}
                                                </span>
                                                {item.subtitle && (
                                                    <span className="text-[11.5px] text-text-muted">{item.subtitle}</span>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <ArrowRight size={14} className="text-text-placeholder shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-border-light flex items-center gap-3 text-[11px] text-text-placeholder shrink-0">
                    <span className="flex items-center gap-1"><kbd className="bg-bg-secondary border border-border-light rounded px-1">↑</kbd><kbd className="bg-bg-secondary border border-border-light rounded px-1">↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="bg-bg-secondary border border-border-light rounded px-1">↵</kbd> Open</span>
                    <span className="flex items-center gap-1"><kbd className="bg-bg-secondary border border-border-light rounded px-1">esc</kbd> Close</span>
                </div>
            </div>
        </div>
    );
}
