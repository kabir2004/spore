'use client';

import React, { useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { BlockRenderer } from './BlockRenderer';
import { SelectionToolbar } from './SelectionToolbar';
import { PageIconPicker } from './PageIconPicker';
import { PageProperties } from './PageProperties';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import {
    DocumentSelectAllProvider,
    SPORE_APPLY_FORMAT_TO_ALL,
    type ApplyFormatToAllDetail,
} from '@/lib/context/DocumentSelectAllContext';
import { FONT_OPTIONS, TEXT_COLOR_OPTIONS, HIGHLIGHT_COLOR_OPTIONS } from '@/lib/editor/formatOptions';
import { sanitizeHtml } from '@/lib/utils/sanitize';

const focusBlockEnd = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.focus();
    try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
    } catch { /* ignore */ }
};

export const BlockEditor = ({ rootBlockId }: { rootBlockId: string }) => {
    const params = useParams();
    const slug = (params?.workspaceSlug as string) || 'kabir';
    const rootBlock = useWorkspaceStore((state) => state.blocks[rootBlockId]);
    const updateBlock = useWorkspaceStore((state) => state.updateBlock);
    const addBlock = useWorkspaceStore((state) => state.addBlock);

    // Granular selector: only re-render when the set of valid child IDs changes.
    // This avoids re-rendering BlockEditor (and all its children) on every keystroke
    // in any block elsewhere in the document.
    const contentIds = useWorkspaceStore(
        useShallow((state) => {
            const content = state.blocks[rootBlockId]?.content ?? [];
            return content.filter((id) => !!state.blocks[id]);
        })
    );
    const titleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = titleRef.current;
        if (!el) return;
        if (document.activeElement !== el) {
            const next = rootBlock?.properties?.title ?? '';
            if (el.textContent !== next) el.textContent = next;
        }
    }, [rootBlock?.properties?.title]);

    if (!rootBlock || rootBlock.type !== 'page') return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-[15px] text-text-muted">Page not found.</p>
            <Link
                href={`/${slug}`}
                className="text-[14px] font-medium text-accent-blue hover:text-accent-blue-hover"
            >
                Back to workspace
            </Link>
        </div>
    );

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const state = useWorkspaceStore.getState();
        const currentRoot = state.blocks[rootBlockId];
        if (!currentRoot) return;

        const validIds = currentRoot.content.filter((id) => state.blocks[id]);
        const newContentIds = Array.from(validIds);
        newContentIds.splice(source.index, 1);
        newContentIds.splice(destination.index, 0, draggableId);
        updateBlock(rootBlockId, { content: newContentIds });
    };

    const addFirstBlock = () => {
        const newId = uuidv4();
        addBlock({
            id: newId,
            type: 'text',
            properties: { text: '' },
            content: [],
            parent_id: rootBlockId,
            created_time: Date.now(),
            last_edited_time: Date.now(),
        });
        const state = useWorkspaceStore.getState();
        const currentContent = state.blocks[rootBlockId]?.content ?? [];
        updateBlock(rootBlockId, { content: [...currentContent, newId] });
        requestAnimationFrame(() => {
            requestAnimationFrame(() => focusBlockEnd(newId));
        });
    };

    const hasContent = rootBlock.content.length > 0;

    // Apply format to all editables (title + every content block) when "document select all" is used
    useEffect(() => {
        const handler = (e: CustomEvent<ApplyFormatToAllDetail>) => {
            const detail = e.detail;
            const titleEl = document.getElementById(`${rootBlockId}-title`) as HTMLDivElement | null;
            const editables: { el: HTMLDivElement; blockId: string }[] = [];
            if (titleEl) editables.push({ el: titleEl, blockId: rootBlockId });
            contentIds.forEach((id) => {
                const el = document.getElementById(id) as HTMLDivElement | null;
                if (el?.getAttribute?.('data-block-editable') === 'true') editables.push({ el, blockId: id });
            });

            const applyToEditable = (el: HTMLDivElement, blockId: string, isTitle: boolean) => {
                const sel = window.getSelection();
                if (!sel) return;
                const range = document.createRange();
                range.selectNodeContents(el);
                sel.removeAllRanges();
                sel.addRange(range);

                if (detail.type === 'execCommand') {
                    document.execCommand(detail.command, false);
                } else if (detail.type === 'font') {
                    const opt = FONT_OPTIONS.find((o) => o.id === detail.fontId);
                    const className = opt?.className ?? '';
                    if (!className) el.innerHTML = el.innerText;
                    else el.innerHTML = `<span class="${className}">${el.innerHTML}</span>`;
                } else if (detail.type === 'textColor') {
                    const opt = TEXT_COLOR_OPTIONS.find((o) => o.id === detail.colorId);
                    const className = opt?.className ?? '';
                    if (className) el.innerHTML = `<span class="${className}">${el.innerHTML}</span>`;
                } else if (detail.type === 'highlight') {
                    const opt = HIGHLIGHT_COLOR_OPTIONS.find((o) => o.id === detail.colorId);
                    const className = opt?.className ?? '';
                    if (className) el.innerHTML = `<span class="${className}">${el.innerHTML}</span>`;
                }

                if (isTitle) {
                    const current = useWorkspaceStore.getState().blocks[rootBlockId];
                    const nextProps = current?.properties ? { ...current.properties, title: el.textContent || '' } : { title: el.textContent || '' };
                    updateBlock(rootBlockId, { properties: nextProps });
                } else {
                    updateBlock(blockId, { properties: { text: sanitizeHtml(el.innerHTML) } });
                }
            };

            editables.forEach(({ el, blockId }) => applyToEditable(el, blockId, blockId === rootBlockId));
        };
        window.addEventListener(SPORE_APPLY_FORMAT_TO_ALL, handler as EventListener);
        return () => window.removeEventListener(SPORE_APPLY_FORMAT_TO_ALL, handler as EventListener);
    }, [rootBlockId, contentIds, updateBlock]);

    return (
        <DocumentSelectAllProvider>
            <SelectionToolbar />
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-col w-full max-w-[720px] mx-auto pt-16 pb-40 px-4">
                    {/* Page icon — aligned with content column */}
                    <div className="pl-10 mb-5">
                        <PageIconPicker
                            value={rootBlock.properties?.icon ?? 'FileText'}
                            onChange={(icon) =>
                                updateBlock(rootBlockId, {
                                    properties: { ...rootBlock.properties, icon },
                                })
                            }
                        />
                    </div>

                    {/* Title */}
                    <div className="pl-10 min-h-[1.2em] mb-1">
                        <div
                            ref={titleRef}
                            id={`${rootBlockId}-title`}
                            className="text-[40px] font-bold text-text-primary tracking-[-0.5px] leading-[1.2] outline-none page-title-editable empty:before:content-['Untitled'] empty:before:text-text-placeholder w-full"
                            contentEditable
                            suppressContentEditableWarning
                            data-block-editable="true"
                            onBlur={(e) => updateBlock(rootBlockId, { properties: { ...rootBlock.properties, title: e.currentTarget.textContent || '' } })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (contentIds.length > 0) {
                                        focusBlockEnd(contentIds[0]);
                                    } else {
                                        addFirstBlock();
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Page properties (custom fields) */}
                    <div className="pl-10 mt-6">
                        <PageProperties
                            fields={rootBlock.properties?.pageFields ?? []}
                            onChange={(pageFields) =>
                                updateBlock(rootBlockId, {
                                    properties: { ...rootBlock.properties, pageFields },
                                })
                            }
                        />
                        <div className="border-t border-border-default mt-4 pt-6" aria-hidden />
                    </div>

                    {/* Hint when page is empty */}
                    {!hasContent && (
                        <p className="text-[15px] text-text-placeholder mt-8 pl-10 select-none pointer-events-none">
                            Press Enter to start writing, or &apos;/&apos; for commands
                        </p>
                    )}

                    {/* Content blocks */}
                    <div className="flex flex-col mt-6">
                        <Droppable droppableId={rootBlockId}>
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="flex flex-col"
                                >
                                    {contentIds.map((blockId, index) => (
                                        <Draggable key={blockId} draggableId={blockId} index={index}>
                                            {(innerProvided) => (
                                                <div
                                                    ref={innerProvided.innerRef}
                                                    {...innerProvided.draggableProps}
                                                    className="flex flex-col"
                                                >
                                                    <BlockRenderer
                                                        blockId={blockId}
                                                        depth={0}
                                                        dragHandleProps={innerProvided.dragHandleProps}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            </DragDropContext>
        </DocumentSelectAllProvider>
    );
};
