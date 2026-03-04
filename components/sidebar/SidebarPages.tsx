'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { useWorkspace } from '@/lib/context/workspaceContext';

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[name as keyof typeof LucideIcons];
    if (!IconComponent) return <LucideIcons.FileText className={className} />;
    return <IconComponent className={className} />;
};

const PageItem = ({ blockId, depth = 0 }: { blockId: string; depth?: number }) => {
    const { slug } = useWorkspace();
    const pathname = usePathname();
    const router = useRouter();
    const block = useWorkspaceStore(state => state.blocks[blockId]);
    const addBlock = useWorkspaceStore(state => state.addBlock);
    const updateBlock = useWorkspaceStore(state => state.updateBlock);
    const [isExpanded, setIsExpanded] = useState(false);

    const childPageIds = useWorkspaceStore(useShallow(state =>
        (state.blocks[blockId]?.content ?? []).filter(id => state.blocks[id]?.type === 'page')
    ));

    if (!block || block.type !== 'page') return null;

    const hasChildren = childPageIds.length > 0;
    const isActive = pathname === `/${slug}/${block.id}`;

    const handleAddSubPage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newId = uuidv4();
        addBlock({
            id: newId,
            type: 'page',
            properties: { title: 'Untitled', icon: 'FileText' },
            content: [],
            parent_id: block.id,
            created_time: Date.now(),
            last_edited_time: Date.now(),
        });
        updateBlock(block.id, { content: [...block.content, newId] });
        setIsExpanded(true);
        router.push(`/${slug}/${newId}`);
    };

    return (
        <div className="flex flex-col">
            <div
                className={cn(
                    'group flex items-center gap-1 rounded-md py-[5px] pr-1 transition-colors font-medium',
                    isActive
                        ? 'bg-bg-active text-text-primary'
                        : 'text-text-secondary hover:bg-bg-hover',
                    depth > 0 && 'ml-4'
                )}
            >
                <div
                    className="w-[20px] flex items-center justify-center shrink-0 cursor-pointer"
                    onClick={() => hasChildren && setIsExpanded(!isExpanded)}
                >
                    {hasChildren ? (
                        <ChevronRight
                            size={14}
                            className={cn(
                                'text-text-placeholder transition-transform duration-150',
                                isExpanded && 'rotate-90'
                            )}
                        />
                    ) : (
                        <span className="w-3.5" />
                    )}
                </div>

                <Link href={`/${slug}/${block.id}`} className="flex flex-1 items-center gap-1.5 min-w-0">
                    <div className={cn('w-[20px] flex items-center justify-center shrink-0', isActive ? 'text-text-secondary' : 'text-text-muted')}>
                        <DynamicIcon name={block.properties.icon || 'FileText'} className="w-[15px] h-[15px]" />
                    </div>
                    <span className="truncate">{block.properties.title || 'Untitled'}</span>
                </Link>

                <button
                    onClick={handleAddSubPage}
                    className="opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-text-primary transition-opacity p-0.5 rounded shrink-0"
                    title="Add sub-page"
                >
                    <Plus size={14} />
                </button>
            </div>

            {hasChildren && isExpanded && (
                <div className="flex flex-col gap-[2px] mt-[2px]">
                    {childPageIds.map((childId: string) => (
                        <PageItem key={childId} blockId={childId} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export function SidebarPages() {
    const { slug } = useWorkspace();
    const router = useRouter();
    const rootId = useWorkspaceStore(state => state.workspaces[slug]?.rootId ?? 'workspace-root');
    const rootBlock = useWorkspaceStore(state => state.blocks[rootId]);
    const addBlock = useWorkspaceStore(state => state.addBlock);
    const updateBlock = useWorkspaceStore(state => state.updateBlock);

    if (!rootBlock) return null;

    const handleNewPage = () => {
        const newId = uuidv4();
        addBlock({
            id: newId,
            type: 'page',
            properties: { title: 'Untitled', icon: 'FileText' },
            content: [],
            parent_id: rootId,
            created_time: Date.now(),
            last_edited_time: Date.now(),
        });
        updateBlock(rootId, { content: [...rootBlock.content, newId] });
        router.push(`/${slug}/${newId}`);
    };

    return (
        <div className="flex flex-col gap-[2px]">
            <div className="flex items-center justify-between px-2 mb-1 group">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider select-none">
                    Pages
                </span>
                <button
                    onClick={handleNewPage}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
                    title="New page"
                >
                    <Plus size={14} />
                </button>
            </div>

            <nav className="flex flex-col gap-[2px]">
                {rootBlock.content.map(childId => (
                    <PageItem key={childId} blockId={childId} />
                ))}
            </nav>
        </div>
    );
}
