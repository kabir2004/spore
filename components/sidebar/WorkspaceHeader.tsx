'use client';

import React, { useRef, useState } from 'react';
import { ChevronDown, Check, Plus, PanelLeftClose, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/context/workspaceContext';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { AppLogo } from '@/components/shared/AppLogo';

export function WorkspaceHeader() {
    const { slug, toggleSidebar } = useWorkspace();
    const router = useRouter();
    const workspaces = useWorkspaceStore(state => state.workspaces);
    const createWorkspace = useWorkspaceStore(state => state.createWorkspace);
    const currentWorkspace = workspaces[slug];
    const workspaceName = currentWorkspace?.name ?? "Workspace";

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toSlug = (name: string) =>
        name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleCreate = () => {
        const name = newName.trim();
        if (!name) return;
        const slug = toSlug(name);
        if (!slug || workspaces[slug]) return; // conflict
        createWorkspace(slug, name);
        setNewName('');
        setShowCreate(false);
        setDropdownOpen(false);
        router.push(`/${slug}`);
    };

    const openCreate = () => {
        setShowCreate(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    // Close on outside click
    React.useEffect(() => {
        if (!dropdownOpen) return;
        const handle = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
                setShowCreate(false);
                setNewName('');
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [dropdownOpen]);

    const allWorkspaces = Object.entries(workspaces);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Header row: workspace dropdown (button) + collapse sidebar (button) */}
            <div className="h-[44px] flex items-center gap-1 px-3 border-b border-border-default w-full">
                <button
                    type="button"
                    onClick={() => { setDropdownOpen(v => !v); setShowCreate(false); setNewName(''); }}
                    className="flex-1 min-w-0 flex items-center gap-2 hover:bg-bg-hover cursor-pointer transition-colors rounded-md py-1 -mx-1 px-1"
                >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 rounded-md overflow-hidden bg-bg-elevated border border-border-default" title="spore">
                        <AppLogo size={20} className="object-contain" />
                    </div>
                    <span className="font-semibold text-text-primary text-[13.5px] flex-1 truncate text-left">
                        {workspaceName}
                    </span>
                    <ChevronDown
                        size={14}
                        className={cn('text-text-muted transition-transform duration-150 shrink-0', dropdownOpen && 'rotate-180')}
                    />
                </button>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="shrink-0 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                >
                    <PanelLeftClose size={16} />
                </button>
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 bg-bg-elevated border border-border-default rounded-b-[10px] shadow-lg overflow-hidden">
                    {/* Workspace list */}
                    <div className="p-1.5">
                        <p className="px-2 py-1.5 text-[10.5px] font-semibold text-text-muted uppercase tracking-wider select-none">
                            Workspaces
                        </p>
                        {allWorkspaces.map(([wsSlug, ws]) => (
                            <button
                                key={wsSlug}
                                onClick={() => {
                                    setDropdownOpen(false);
                                    if (wsSlug !== slug) router.push(`/${wsSlug}`);
                                }}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] transition-colors text-left',
                                    wsSlug === slug
                                        ? 'bg-bg-active text-text-primary'
                                        : 'text-text-secondary hover:bg-bg-hover'
                                )}
                            >
                                <div className="w-[18px] h-[18px] flex items-center justify-center rounded overflow-hidden border border-border-default shrink-0 bg-bg-elevated">
                                    <AppLogo size={14} className="object-contain" />
                                </div>
                                <span className="flex-1 truncate text-[13px] font-medium">{ws.name}</span>
                                {wsSlug === slug && <Check size={13} className="text-accent-blue shrink-0" />}
                            </button>
                        ))}
                    </div>

                    <div className="h-px bg-border-light" />

                    {/* Settings link */}
                    <div className="px-1.5 pb-1">
                        <Link
                            href={`/${slug}/settings`}
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px]"
                        >
                            <Settings size={14} />
                            <span>Settings</span>
                        </Link>
                    </div>

                    <div className="h-px bg-border-light" />

                    {/* Create workspace */}
                    <div className="p-1.5">
                        {!showCreate ? (
                            <button
                                onClick={openCreate}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px]"
                            >
                                <Plus size={14} />
                                <span>Create workspace</span>
                            </button>
                        ) : (
                            <div className="px-1 py-1">
                                <p className="text-[11px] text-text-muted mb-1.5 px-1">Workspace name</p>
                                <input
                                    ref={inputRef}
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                                    }}
                                    placeholder="e.g. Acme Corp"
                                    className="w-full text-[13px] bg-bg-primary border border-border-default rounded-[6px] px-3 py-1.5 outline-none text-text-primary placeholder:text-text-placeholder focus:border-accent-blue transition-colors mb-2"
                                />
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim()}
                                        className="flex-1 py-1.5 text-[12px] font-medium bg-accent-blue text-white rounded-[6px] hover:bg-accent-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => { setShowCreate(false); setNewName(''); }}
                                        className="flex-1 py-1.5 text-[12px] text-text-secondary border border-border-default rounded-[6px] hover:bg-bg-hover transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
