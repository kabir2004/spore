'use client';

import { createContext, useContext } from 'react';

interface WorkspaceContextValue {
    slug: string;
    workspaceId: string;
    toggleSidebar: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
    slug: 'kabir',
    workspaceId: '',
    toggleSidebar: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);
export const WorkspaceProvider = WorkspaceContext.Provider;
