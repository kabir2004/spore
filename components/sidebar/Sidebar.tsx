import React from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarPages } from './SidebarPages';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    return (
        <aside
            className={cn(
                'w-[260px] flex-shrink-0 h-screen flex flex-col bg-bg-secondary border-r border-border-default overflow-hidden text-[13.5px]',
                className
            )}
        >
            <WorkspaceHeader />
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-4 py-4 px-2 custom-scrollbar">
                <SidebarNav />
                <SidebarPages />
            </div>
            <div className="p-2 border-t border-border-default">
                <form action={signOut} className="w-full">
                    <button
                        type="submit"
                        className="w-full flex items-center gap-2 rounded-md px-[10px] py-[5px] text-text-secondary hover:bg-bg-hover transition-colors font-medium"
                    >
                        <div className="w-[22px] flex items-center justify-center">
                            <LogOut size={16} />
                        </div>
                        <span className="truncate">Sign out</span>
                    </button>
                </form>
            </div>
        </aside>
    );
}
