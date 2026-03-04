'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

export function Editor({ initialContent }: { initialContent?: string }) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
        ],
        content: initialContent || '<h1>🔭 Product Vision</h1><p>Start typing...</p>',
        editorProps: {
            attributes: {
                class:
                    'prose prose-sm sm:prose-base focus:outline-none max-w-[720px] mx-auto w-full px-6 sm:px-[60px] py-12',
            },
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="w-full relative editor-wrapper text-text-primary text-[15px] leading-[1.65]">
            <EditorContent editor={editor} />
        </div>
    );
}
