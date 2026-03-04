'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Smile, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMON_EMOJIS = [
    '📄', '📋', '📌', '📎', '📁', '📂', '📅', '📆', '📊', '📈', '📉',
    '💡', '🔥', '⭐', '✅', '🎯', '🚀', '📝', '📖', '📚', '🔖', '📌',
    '💼', '🏠', '🎨', '🔧', '⚙️', '👤', '👥', '📧', '🔔', '❤️', '💬',
];

const PAGE_ICONS = [
    'FileText', 'File', 'Home', 'Folder', 'FolderOpen',
    'Calendar', 'CalendarDays', 'List', 'ListTodo', 'CheckSquare',
    'BookOpen', 'BookMarked', 'StickyNote', 'FileCode',
    'Image', 'Palette', 'Code', 'BarChart2', 'BarChart3',
    'Users', 'User', 'MessageSquare', 'Mail', 'Bell',
    'Star', 'Heart', 'Target', 'Rocket', 'Lightbulb',
    'Settings', 'ClipboardList', 'Layout', 'Layers',
];

interface PageIconPickerProps {
    value: string | undefined;
    onChange: (icon: string) => void;
    className?: string;
}

function isEmoji(s: string): boolean {
    return s.length > 0 && !/^[A-Za-z]/.test(s);
}

export function PageIconPicker({ value, onChange, className }: PageIconPickerProps) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'emoji' | 'icon'>('emoji');
    const [emojiSearch, setEmojiSearch] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    const displayValue = value || 'FileText';
    const showAsEmoji = isEmoji(displayValue);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const filteredEmojis = emojiSearch.trim()
        ? COMMON_EMOJIS.filter((e) => e.includes(emojiSearch.trim()))
        : COMMON_EMOJIS;

    return (
        <div ref={popoverRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-bg-elevated border border-border-default hover:border-border-default hover:bg-bg-hover transition-colors duration-200 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 focus:ring-offset-bg-primary"
                aria-label="Change icon"
            >
                {showAsEmoji ? (
                    <span className="text-[28px] leading-none select-none">{displayValue}</span>
                ) : (
                    (() => {
                        const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[displayValue];
                        return Icon ? <Icon size={24} className="text-accent-green" /> : <LucideIcons.FileText size={24} className="text-accent-green" />;
                    })()
                )}
                <ChevronDown
                    size={14}
                    className={cn('absolute bottom-0.5 right-0.5 text-text-muted opacity-70 bg-bg-primary/90 rounded transition-transform duration-200', open && 'rotate-180')}
                />
            </button>

            {open && (
                <div
                    className="absolute left-0 top-full mt-2 z-50 w-[320px] rounded-lg border border-border-default bg-bg-primary shadow-lg overflow-hidden"
                    style={{ animation: 'sporePopoverIn 0.15s ease-out forwards' }}
                    role="dialog"
                    aria-label="Choose page icon"
                >
                    <div className="flex border-b border-border-default">
                        <button
                            type="button"
                            onClick={() => setTab('emoji')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors duration-150',
                                tab === 'emoji' ? 'text-accent-blue bg-accent-blue-soft border-b-2 border-accent-blue' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                            )}
                        >
                            <Smile size={16} />
                            Emoji
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('icon')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors duration-150',
                                tab === 'icon' ? 'text-accent-blue bg-accent-blue-soft border-b-2 border-accent-blue' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                            )}
                        >
                            <Type size={16} />
                            Icon
                        </button>
                    </div>

                    <div className="p-2.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                        {tab === 'emoji' && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Search emoji..."
                                    value={emojiSearch}
                                    onChange={(e) => setEmojiSearch(e.target.value)}
                                    className="w-full px-2.5 py-1.5 mb-2 text-[13px] rounded-md border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                                />
                                <div className="grid grid-cols-8 gap-1">
                                    {filteredEmojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                onChange(emoji);
                                                setOpen(false);
                                            }}
                                            className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-bg-hover text-[20px] transition-colors duration-150 active:scale-95"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {tab === 'icon' && (
                            <div className="grid grid-cols-6 gap-1">
                                {PAGE_ICONS.map((name) => {
                                    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
                                    if (!Icon) return null;
                                    const selected = !showAsEmoji && value === name;
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => {
                                                onChange(name);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                'flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-150',
                                                selected ? 'bg-accent-blue-soft text-accent-blue' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary active:scale-95'
                                            )}
                                            title={name}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
