'use client';

import React, { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import {
    Type, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
    ChevronRight, Quote, AlertCircle, Code2, Sigma, Minus,
    ImageIcon, Video, Music, Paperclip, Globe, Bookmark, Search,
} from 'lucide-react';
import { BlockType } from '@/lib/types/block';
import { cn } from '@/lib/utils';

interface CommandDef {
    label: string;
    description: string;
    type: BlockType;
    icon: React.ElementType;
}

interface CommandGroup {
    label: string;
    commands: CommandDef[];
}

const COMMAND_GROUPS: CommandGroup[] = [
    {
        label: 'Basic blocks',
        commands: [
            { label: 'Text', description: 'Just start writing with plain text', type: 'text', icon: Type },
            { label: 'Heading 1', description: 'Big section heading', type: 'h1', icon: Heading1 },
            { label: 'Heading 2', description: 'Medium section heading', type: 'h2', icon: Heading2 },
            { label: 'Heading 3', description: 'Small section heading', type: 'h3', icon: Heading3 },
            { label: 'Bulleted List', description: 'Create a simple bulleted list', type: 'bulleted_list_item', icon: List },
            { label: 'Numbered List', description: 'Create a numbered list', type: 'numbered_list_item', icon: ListOrdered },
            { label: 'To-do List', description: 'Track tasks with checkboxes', type: 'to_do', icon: ListTodo },
            { label: 'Toggle', description: 'Collapsible content section', type: 'toggle', icon: ChevronRight },
            { label: 'Quote', description: 'Capture a quote or excerpt', type: 'quote', icon: Quote },
            { label: 'Callout', description: 'Make writing stand out', type: 'callout', icon: AlertCircle },
            { label: 'Code', description: 'Capture a code snippet', type: 'code', icon: Code2 },
            { label: 'Equation', description: 'Write a LaTeX equation', type: 'equation', icon: Sigma },
            { label: 'Divider', description: 'Visually divide blocks', type: 'divider', icon: Minus },
        ],
    },
    {
        label: 'Media',
        commands: [
            { label: 'Image', description: 'Upload or embed an image', type: 'image', icon: ImageIcon },
            { label: 'Video', description: 'Upload or embed a video', type: 'video', icon: Video },
            { label: 'Audio', description: 'Upload or embed an audio file', type: 'audio', icon: Music },
            { label: 'File', description: 'Upload any file or document', type: 'file', icon: Paperclip },
        ],
    },
    {
        label: 'Embeds',
        commands: [
            { label: 'Bookmark', description: 'Save a link as a visual bookmark', type: 'bookmark', icon: Bookmark },
            { label: 'Embed', description: 'Embed any URL as an iframe', type: 'embed', icon: Globe },
        ],
    },
];

const ALL_COMMANDS: CommandDef[] = COMMAND_GROUPS.flatMap(g => g.commands);

interface SlashCommandMenuProps {
    x: number;
    y: number;
    onSelect: (type: BlockType) => void;
    onClose: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ x, y, onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredCommands = useMemo(() => {
        if (!query.trim()) return ALL_COMMANDS;
        const q = query.toLowerCase();
        return ALL_COMMANDS.filter(c =>
            c.label.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
        );
    }, [query]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands]);

    // Auto-focus the search input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Clamp menu position to stay within viewport
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const PADDING = 8;
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth - PADDING) {
            el.style.left = `${Math.max(PADDING, window.innerWidth - rect.width - PADDING)}px`;
        }
        if (rect.bottom > window.innerHeight - PADDING) {
            el.style.top = `${Math.max(PADDING, window.innerHeight - rect.height - PADDING)}px`;
        }
    }, [x, y]);

    // Keyboard navigation and click-outside
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        onSelect(filteredCommands[selectedIndex].type);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedIndex, filteredCommands, onSelect, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const selected = list.querySelector('[data-selected="true"]') as HTMLElement | null;
        selected?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    // Build display items: grouped when no query, flat when searching
    const displayItems = useMemo(() => {
        if (query.trim()) {
            return filteredCommands.map((cmd, i) => ({
                kind: 'command' as const,
                cmd,
                flatIndex: i,
            }));
        }
        let idx = 0;
        return COMMAND_GROUPS.flatMap(group => [
            { kind: 'header' as const, label: group.label },
            ...group.commands.map(cmd => ({
                kind: 'command' as const,
                cmd,
                flatIndex: idx++,
            })),
        ]);
    }, [query, filteredCommands]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] w-[300px] bg-bg-primary border border-border-default rounded-[10px] shadow-lg overflow-hidden flex flex-col pointer-events-auto"
            style={{ top: y, left: x }}
        >
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-light shrink-0">
                <Search size={13} className="text-text-placeholder shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search blocks..."
                    className="flex-1 text-[13px] bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                />
            </div>

            {/* Command list */}
            <div ref={listRef} className="flex flex-col p-1 max-h-[380px] overflow-y-auto custom-scrollbar">
                {filteredCommands.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-text-placeholder">
                        No results for &quot;{query}&quot;
                    </div>
                ) : (
                    displayItems.map((item, i) => {
                        if (item.kind === 'header') {
                            return (
                                <div
                                    key={`header-${item.label}-${i}`}
                                    className="px-2 pt-3 pb-1 text-[10.5px] font-semibold text-text-muted uppercase tracking-wider first:pt-1"
                                >
                                    {item.label}
                                </div>
                            );
                        }

                        const { cmd, flatIndex } = item;
                        const isSelected = selectedIndex === flatIndex;

                        return (
                            <button
                                key={cmd.type}
                                data-selected={isSelected}
                                className={cn(
                                    'flex items-center gap-3 w-full p-2 rounded-[6px] transition-colors text-left',
                                    isSelected ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                                )}
                                onClick={() => onSelect(cmd.type)}
                                onMouseEnter={() => setSelectedIndex(flatIndex)}
                            >
                                <div className="w-[36px] h-[36px] rounded-[6px] border border-border-default flex items-center justify-center bg-bg-secondary shrink-0 text-text-secondary">
                                    <cmd.icon size={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[13.5px] font-medium text-text-primary leading-tight">
                                        {cmd.label}
                                    </span>
                                    <span className="text-[11.5px] text-text-muted leading-tight truncate">
                                        {cmd.description}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};
