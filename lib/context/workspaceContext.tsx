'use client';

import { createContext, useContext } from 'react';

export interface WorkspaceUser {
  id:         string;
  email:      string;
  name:       string | null;
  avatarUrl:  string | null;
}

interface WorkspaceContextValue {
  slug:        string;
  workspaceId: string;
  user:        WorkspaceUser | null;
  toggleSidebar: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  slug:          'kabir',
  workspaceId:   '',
  user:          null,
  toggleSidebar: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);
export const WorkspaceProvider = WorkspaceContext.Provider;
