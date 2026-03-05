'use client';

import React, { useMemo } from 'react';
import { Share2, MoreHorizontal } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { useWorkspace } from '@/lib/context/workspaceContext';
import { IBlock } from '@/lib/types/block';

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (LucideIcons as any)[name as keyof typeof LucideIcons];
    if (!IconComponent) return <LucideIcons.FileText className={className} />;
    return <IconComponent className={className} />;
};

function findPageTrail(getBlock: (id: string) => IBlock | undefined, targetId: string): IBlock[] {
    const trail: IBlock[] = [];
    let currentId: string | null = targetId;
    let depth = 0;
    while (currentId && depth < 20) {
        const block = getBlock(currentId);
        if (!block) break;
        trail.unshift(block);
        currentId = block.parent_id;
        depth++;
    }
    return trail.filter(b => b.id !== 'workspace-root');
}

export function TopBar() {
    const params = useParams();
    const { slug } = useWorkspace();
    const pageId = params.pageId as string | undefined;
    const getBlock = useWorkspaceStore(state => state.getBlock);
    const workspaceName = useWorkspaceStore(state => state.workspaces[slug as string]?.name);

    const breadcrumbs = useMemo(() => {
        if (!pageId) return [];
        return findPageTrail(getBlock, pageId);
    }, [pageId, getBlock]);

    return (
        <header className="h-[44px] flex items-center justify-between px-4 border-b border-border-default shrink-0 bg-bg-primary w-full">
            <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-medium min-w-0">
                    <Link
                        href={`/${slug}`}
                        className="text-text-secondary hover:text-text-primary transition-colors shrink-0 whitespace-nowrap"
                    >
                        {workspaceName || `${slug}'s Workspace`}
                    </Link>

                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id}>
                            <span className="text-text-placeholder shrink-0">/</span>
                            <Link
                                href={`/${slug}/${crumb.id}`}
                                className={cn(
                                    'flex items-center gap-1.5 transition-colors min-w-0',
                                    idx === breadcrumbs.length - 1
                                        ? 'text-text-primary'
                                        : 'text-text-secondary hover:text-text-primary'
                                )}
                            >
                                <DynamicIcon
                                    name={crumb.properties.icon || 'FileText'}
                                    className={cn(
                                        'w-3.5 h-3.5 shrink-0',
                                        idx === breadcrumbs.length - 1 ? 'text-text-muted' : 'text-text-placeholder'
                                    )}
                                />
                                <span className={idx < breadcrumbs.length - 1 ? 'truncate max-w-[120px]' : 'truncate'}>
                                    {crumb.properties.title || 'Untitled'}
                                </span>
                            </Link>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-text-secondary rounded-[6px] hover:bg-bg-hover transition-colors">
                    <Share2 size={13} />
                    <span>Share</span>
                </button>
                <button className="text-text-muted hover:text-text-primary p-1.5 rounded-[5px] hover:bg-bg-hover transition-colors">
                    <MoreHorizontal size={17} />
                </button>
                <div className="h-4 w-px bg-border-default mx-1" />
                <ProfileMenu />
            </div>
        </header>
    );
}
