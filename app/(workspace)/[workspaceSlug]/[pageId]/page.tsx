import { BlockEditor } from '@/components/editor/BlockEditor';
import { EditorErrorBoundary } from '@/components/editor/EditorErrorBoundary';

export default async function PageRoute({ params }: { params: Promise<{ pageId: string }> }) {
    const { pageId } = await params;
    return (
        <EditorErrorBoundary>
            <BlockEditor rootBlockId={pageId} />
        </EditorErrorBoundary>
    );
}
