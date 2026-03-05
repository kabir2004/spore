'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Code, Type, Palette, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_OPTIONS, TEXT_COLOR_OPTIONS, HIGHLIGHT_COLOR_OPTIONS } from '@/lib/editor/formatOptions';
import { useDocumentSelectAll, dispatchApplyFormatToAll } from '@/lib/context/DocumentSelectAllContext';

const SAVE_BLOCK_EVENT = 'spore-save-block';

// execCommand / queryCommandState are spec-deprecated but remain the only reliable
// contentEditable formatting APIs. Neither will be removed from browsers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const doc = document as any;
const execFormat = (cmd: string) => doc.execCommand(cmd, false);
const queryFormat = (cmd: string): boolean => doc.queryCommandState(cmd);

const TOOLBAR_HEIGHT = 40;
const TOOLBAR_OFFSET = 12;
const TOOLBAR_WIDTH = 380;

interface ToolbarState {
    visible: boolean;
    x: number;
    y: number;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrike: boolean;
}

export function SelectionToolbar() {
    const { documentSelectAll, setDocumentSelectAll } = useDocumentSelectAll();
    const [toolbar, setToolbar] = useState<ToolbarState>({
        visible: false,
        x: 0,
        y: 0,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrike: false,
    });
    const [fontOpen, setFontOpen] = useState(false);
    const [colorOpen, setColorOpen] = useState(false);
    const [highlightOpen, setHighlightOpen] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Show toolbar when "document select all" is active (no selection needed)
    useEffect(() => {
        if (documentSelectAll) {
            setToolbar((s) => ({ ...s, visible: true, x: window.innerWidth / 2, y: 100 }));
        }
    }, [documentSelectAll]);

    const readCommandState = (): Pick<ToolbarState, 'isBold' | 'isItalic' | 'isUnderline' | 'isStrike'> => ({
        isBold: queryFormat('bold'),
        isItalic: queryFormat('italic'),
        isUnderline: queryFormat('underline'),
        isStrike: queryFormat('strikeThrough'),
    });

    const getEditableFromSelection = (): HTMLElement | null => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        let node: Node | null = selection.anchorNode;
        while (node) {
            const el = node as HTMLElement;
            if (el.getAttribute?.('data-block-editable') === 'true') return el;
            node = node.parentNode;
        }
        return null;
    };

    const persistCurrentBlock = () => {
        const editable = getEditableFromSelection() ?? document.activeElement as HTMLElement | null;
        if (editable?.getAttribute?.('data-block-editable') === 'true') {
            editable.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
        }
    };

    const checkSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
            setToolbar(s => ({ ...s, visible: false }));
            return;
        }

        const editable = getEditableFromSelection();
        if (!editable) {
            setToolbar(s => ({ ...s, visible: false }));
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setToolbar({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.top,
            ...readCommandState(),
        });
    };

    useEffect(() => {
        const onMouseUp = () => setTimeout(checkSelection, 0);
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                setTimeout(checkSelection, 0);
            }
        };
        const onMouseDown = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed) {
                    setToolbar(s => ({ ...s, visible: false }));
                    setDocumentSelectAll(false);
                }
            }
        };

        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, []);

    useEffect(() => {
        const closeDropdowns = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setFontOpen(false);
                setColorOpen(false);
                setHighlightOpen(false);
            }
        };
        document.addEventListener('mousedown', closeDropdowns);
        return () => document.removeEventListener('mousedown', closeDropdowns);
    }, []);

    const execute = (command: string) => {
        if (documentSelectAll) {
            dispatchApplyFormatToAll({ type: 'execCommand', command });
            setDocumentSelectAll(false);
            setToolbar((s) => ({ ...s, visible: false }));
            return;
        }
        const selection = window.getSelection();
        const editable = getEditableFromSelection();
        if (!selection || selection.rangeCount === 0 || !editable) return;

        // Save range so we can restore after execCommand (some browsers collapse selection)
        const range = selection.getRangeAt(0).cloneRange();

        execFormat(command);

        // Restore selection so user keeps formatting context and toolbar state updates
        try {
            selection.removeAllRanges();
            selection.addRange(range);
        } catch {
            // Ignore if range became invalid
        }

        editable.focus();
        setToolbar(s => ({ ...s, ...readCommandState() }));
        persistCurrentBlock();
        setTimeout(checkSelection, 10);
    };

    const execInlineCode = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (!selectedText) return;

        const parent = getEditableFromSelection();
        if (!parent) return;

        // If selection is entirely inside a single <code> element, unwrap it (toggle off)
        const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as Element;
        const endEl = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer as Element;
        const startCode = startEl?.closest?.('code') ?? null;
        const endCode = endEl?.closest?.('code') ?? null;
        if (startCode && startCode === endCode) {
            const code = startCode as HTMLElement;
            const text = code.textContent ?? '';
            const textNode = document.createTextNode(text);
            code.parentNode?.replaceChild(textNode, code);
            const newRange = document.createRange();
            newRange.setStart(textNode, 0);
            newRange.setEnd(textNode, textNode.length);
            selection.removeAllRanges();
            selection.addRange(newRange);
            setToolbar(s => ({ ...s, visible: false }));
            parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
            return;
        }

        // Wrap selection in a single <code> element (don't nest)
        range.deleteContents();
        const code = document.createElement('code');
        code.className = 'inline-code';
        code.textContent = selectedText;
        range.insertNode(code);

        const newRange = document.createRange();
        newRange.setStartAfter(code);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        setToolbar(s => ({ ...s, visible: false }));
        parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
    };

    // ── Wrap/unwrap selection in span with class (for font & color) ─────────────
    const getSelectionSpanWithClass = (className: string): HTMLElement | null => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const startEl = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode as Element;
        const endEl = selection.focusNode?.nodeType === Node.TEXT_NODE ? selection.focusNode.parentElement : selection.focusNode as Element;
        const startSpan = startEl?.closest?.(`span.${className}`) ?? null;
        const endSpan = endEl?.closest?.(`span.${className}`) ?? null;
        return startSpan && startSpan === endSpan ? (startSpan as HTMLElement) : null;
    };

    const wrapSelectionInSpan = (className: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const text = range.toString();
        if (!text) return;
        const parent = getEditableFromSelection();
        if (!parent) return;
        range.deleteContents();
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
    };

    const unwrapSpan = (span: HTMLElement) => {
        const text = span.textContent ?? '';
        const textNode = document.createTextNode(text);
        span.parentNode?.replaceChild(textNode, span);
        const selection = window.getSelection();
        if (selection) {
            const newRange = document.createRange();
            newRange.setStart(textNode, 0);
            newRange.setEnd(textNode, textNode.length);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    };

    const applyFont = (fontId: string) => {
        if (documentSelectAll) {
            dispatchApplyFormatToAll({ type: 'font', fontId });
            setDocumentSelectAll(false);
            setToolbar((s) => ({ ...s, visible: false }));
            setFontOpen(false);
            return;
        }
        const opt = FONT_OPTIONS.find(o => o.id === fontId);
        const className = opt?.className ?? '';
        const parent = getEditableFromSelection();
        if (!parent) return;
        if (!className) {
            const span = getSelectionSpanWithClass('inline-font-mono');
            if (span) unwrapSpan(span);
        } else {
            const span = getSelectionSpanWithClass(className);
            if (span) unwrapSpan(span);
            else wrapSelectionInSpan(className);
        }
        parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
        setFontOpen(false);
    };

    const applyTextColor = (colorId: string) => {
        if (documentSelectAll) {
            dispatchApplyFormatToAll({ type: 'textColor', colorId });
            setDocumentSelectAll(false);
            setToolbar((s) => ({ ...s, visible: false }));
            setColorOpen(false);
            return;
        }
        const opt = TEXT_COLOR_OPTIONS.find(o => o.id === colorId);
        const className = opt?.className ?? '';
        const parent = getEditableFromSelection();
        if (!parent) return;
        TEXT_COLOR_OPTIONS.forEach(o => {
            if (!o.className) return;
            const span = getSelectionSpanWithClass(o.className);
            if (span) unwrapSpan(span);
        });
        if (className) wrapSelectionInSpan(className);
        parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
        setColorOpen(false);
    };

    const applyHighlight = (colorId: string) => {
        const opt = HIGHLIGHT_COLOR_OPTIONS.find(o => o.id === colorId);
        const className = opt?.className ?? '';
        const parent = getEditableFromSelection();
        if (!parent) return;
        HIGHLIGHT_COLOR_OPTIONS.forEach(o => {
            if (!o.className) return;
            const span = getSelectionSpanWithClass(o.className);
            if (span) unwrapSpan(span);
        });
        if (className) wrapSelectionInSpan(className);
        parent.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
        setHighlightOpen(false);
    };

    if (!toolbar.visible && !documentSelectAll) return null;

    const clampedX = Math.max(TOOLBAR_WIDTH / 2 + 8, Math.min(toolbar.x, window.innerWidth - TOOLBAR_WIDTH / 2 - 8));
    const top = toolbar.y - TOOLBAR_HEIGHT - TOOLBAR_OFFSET;
    const clampedTop = Math.max(TOOLBAR_OFFSET, Math.min(top, window.innerHeight - TOOLBAR_HEIGHT - TOOLBAR_OFFSET));

    return (
        <div
            ref={toolbarRef}
            role="toolbar"
            aria-label="Text formatting"
            className="fixed z-[60] flex items-center gap-0.5 bg-bg-elevated border border-border-default rounded-[8px] shadow-lg px-1.5 py-1.5 -translate-x-1/2 transition-[opacity,transform] duration-200 ease-out"
            style={{
                left: clampedX,
                top: clampedTop,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
            }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <ToolButton active={toolbar.isBold} onClick={() => execute('bold')} title="Bold (⌘B)" ariaLabel="Bold">
                <Bold size={13} strokeWidth={2.5} />
            </ToolButton>
            <ToolButton active={toolbar.isItalic} onClick={() => execute('italic')} title="Italic (⌘I)" ariaLabel="Italic">
                <Italic size={13} />
            </ToolButton>
            <ToolButton active={toolbar.isUnderline} onClick={() => execute('underline')} title="Underline (⌘U)" ariaLabel="Underline">
                <Underline size={13} />
            </ToolButton>
            <ToolButton active={toolbar.isStrike} onClick={() => execute('strikeThrough')} title="Strikethrough" ariaLabel="Strikethrough">
                <Strikethrough size={13} />
            </ToolButton>
            <div className="w-px h-4 bg-border-default mx-0.5 shrink-0" aria-hidden />
            <ToolButton active={false} onClick={execInlineCode} title="Inline code" ariaLabel="Inline code">
                <Code size={13} />
            </ToolButton>
            <div className="w-px h-4 bg-border-default mx-0.5 shrink-0" aria-hidden />

            {/* Font */}
            <div className="relative">
                <ToolButton
                    active={fontOpen}
                    onClick={() => { setFontOpen(!fontOpen); setColorOpen(false); setHighlightOpen(false); }}
                    title="Font"
                    ariaLabel="Font"
                >
                    <Type size={13} />
                </ToolButton>
                {fontOpen && (
                    <div className="absolute top-full left-0 mt-1 py-1 bg-bg-elevated border border-border-default rounded-[8px] shadow-lg min-w-[120px] z-10">
                        {FONT_OPTIONS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                className="w-full px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-bg-hover rounded-[4px]"
                                onClick={() => applyFont(f.id)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Text color */}
            <div className="relative">
                <ToolButton
                    active={colorOpen}
                    onClick={() => { setColorOpen(!colorOpen); setFontOpen(false); setHighlightOpen(false); }}
                    title="Text color"
                    ariaLabel="Text color"
                >
                    <Palette size={13} />
                </ToolButton>
                {colorOpen && (
                    <div className="absolute top-full left-0 mt-1 py-1.5 px-2 bg-bg-elevated border border-border-default rounded-[8px] shadow-lg z-10 flex flex-wrap gap-1">
                        {TEXT_COLOR_OPTIONS.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                title={c.label}
                                className={cn(
                                    'w-6 h-6 rounded-[6px] border border-border-default hover:ring-2 hover:ring-accent-blue/50 transition-all',
                                    c.id === 'default' && 'bg-bg-primary',
                                    c.id === 'muted' && 'bg-text-muted',
                                    c.id === 'blue' && 'bg-accent-blue',
                                    c.id === 'green' && 'bg-accent-green',
                                    c.id === 'red' && 'bg-accent-red',
                                    c.id === 'orange' && 'bg-accent-orange',
                                    c.id === 'purple' && 'bg-accent-purple'
                                )}
                                onClick={() => applyTextColor(c.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Highlight */}
            <div className="relative">
                <ToolButton
                    active={highlightOpen}
                    onClick={() => { setHighlightOpen(!highlightOpen); setFontOpen(false); setColorOpen(false); }}
                    title="Highlight"
                    ariaLabel="Highlight"
                >
                    <Highlighter size={13} />
                </ToolButton>
                {highlightOpen && (
                    <div className="absolute top-full left-0 mt-1 py-1.5 px-2 bg-bg-elevated border border-border-default rounded-[8px] shadow-lg z-10 flex flex-wrap gap-1">
                        {HIGHLIGHT_COLOR_OPTIONS.map((h) => (
                            <button
                                key={h.id}
                                type="button"
                                title={h.label}
                                className={cn(
                                    'w-6 h-6 rounded-[6px] border border-border-default hover:ring-2 hover:ring-accent-blue/50 transition-all',
                                    h.id === 'none' && 'bg-bg-primary',
                                    h.id === 'yellow' && 'bg-yellow-300',
                                    h.id === 'green' && 'bg-green-300',
                                    h.id === 'blue' && 'bg-blue-300',
                                    h.id === 'pink' && 'bg-pink-300'
                                )}
                                onClick={() => applyHighlight(h.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToolButton({
    children,
    active,
    onClick,
    title,
    ariaLabel,
}: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    title: string;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={ariaLabel}
            onClick={onClick}
            className={cn(
                'flex items-center justify-center w-[28px] h-[28px] rounded-[5px] transition-colors duration-150',
                active
                    ? 'bg-bg-active text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            )}
        >
            {children}
        </button>
    );
}
