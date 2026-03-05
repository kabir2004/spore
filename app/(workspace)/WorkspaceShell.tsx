'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { CollapsedNavRail } from '@/components/sidebar/CollapsedNavRail';
import { TopBar } from '@/components/shared/TopBar';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { WorkspaceProvider, type WorkspaceUser } from '@/lib/context/workspaceContext';
import { useWorkspaceSync } from '@/lib/sync/useWorkspaceSync';
import { StoreRehydrate } from '@/lib/components/StoreRehydrate';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/workspace/PageTransition';

interface WorkspaceShellProps {
  children:      React.ReactNode;
  slug:          string;
  workspaceId:   string;
  workspaceName: string;
  rootId:        string;
  user:          WorkspaceUser;
}

export function WorkspaceShell({
  children,
  slug,
  workspaceId,
  workspaceName,
  rootId,
  user,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useWorkspaceSync(workspaceId, slug, workspaceName, rootId);

  return (
    <WorkspaceProvider
      value={{
        slug,
        workspaceId,
        user,
        toggleSidebar: () => setSidebarOpen((v) => !v),
      }}
    >
      <StoreRehydrate />
      <div className="flex bg-bg-primary h-screen w-full overflow-hidden text-text-primary font-sans antialiased">
        <CommandPalette />
        <div
          className={cn(
            'flex-shrink-0 h-screen overflow-hidden transition-[width] duration-300 ease-out',
            sidebarOpen ? 'w-[260px]' : 'w-10'
          )}
        >
          {sidebarOpen ? (
            <Sidebar />
          ) : (
            <CollapsedNavRail onExpand={() => setSidebarOpen(true)} />
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0 relative transition-[margin,width] duration-300 ease-out">
          <TopBar />
          <main className="flex-1 overflow-y-auto w-full relative">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
