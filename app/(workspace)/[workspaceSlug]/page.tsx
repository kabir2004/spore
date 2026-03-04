import { HomePage } from '@/components/workspace/HomePage';

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
    const { workspaceSlug } = await params;
    return <HomePage workspaceSlug={workspaceSlug} />;
}
