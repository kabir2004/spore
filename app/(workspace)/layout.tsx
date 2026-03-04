/**
 * Workspace route group layout — pass-through only.
 * Auth and WorkspaceShell are in [workspaceSlug]/layout.tsx so that
 * params.workspaceSlug is always defined (avoids redirect loops).
 */
export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
