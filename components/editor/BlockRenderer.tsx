'use client';

import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { IBlock } from '@/lib/types/block';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import {
    Check, GripVertical, Plus, ChevronRight, Copy, ExternalLink,
    ImageIcon, Video, Music, Paperclip, Globe, Bookmark,
    Quote, Sigma,
} from 'lucide-react';
import { SlashCommandMenu } from './overlays/SlashCommandMenu';
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { useDocumentSelectAll } from '@/lib/context/DocumentSelectAllContext';

interface BlockRendererProps {
    blockId: string;
    depth?: number;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CODE_LANGUAGES = [
    'Plain Text', 'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go',
    'HTML', 'CSS', 'JSON', 'SQL', 'Shell', 'C', 'C++', 'Java', 'Ruby',
    'Swift', 'Kotlin', 'PHP', 'YAML', 'Markdown',
];

const CALLOUT_COLORS: Record<string, { bg: string; border: string; swatch: string }> = {
    gray:   { bg: 'bg-bg-secondary',        border: 'border-border-default', swatch: '#9B9B9B' },
    blue:   { bg: 'bg-accent-blue-soft',    border: 'border-transparent',    swatch: '#2383E2' },
    green:  { bg: 'bg-accent-green-soft',   border: 'border-transparent',    swatch: '#0F7B6C' },
    orange: { bg: 'bg-accent-orange-soft',  border: 'border-transparent',    swatch: '#D9730D' },
    red:    { bg: 'bg-accent-red-soft',     border: 'border-transparent',    swatch: '#E03E3E' },
    purple: { bg: 'bg-accent-purple-soft',  border: 'border-transparent',    swatch: '#6940A5' },
};

const LIST_TYPES = ['to_do', 'bulleted_list_item', 'numbered_list_item', 'toggle'] as const;

// ─── DragHandle ───────────────────────────────────────────────────────────────
// Pick-up buttons: add block + drag. Centered vertically, smooth opacity transition.

const DRAG_HANDLE_WIDTH = 40;

const DragHandle = ({
    dragHandleProps,
    onAddBelow,
}: {
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
    onAddBelow?: () => void;
}) => (
    <div
        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-200 ease-out"
        style={{ pointerEvents: 'auto', width: DRAG_HANDLE_WIDTH }}
    >
        <button
            type="button"
            onClick={onAddBelow}
            className="flex items-center justify-center w-6 h-6 rounded-[5px] text-text-placeholder hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 ease-out"
            title="Add block below"
            aria-label="Add block below"
        >
            <Plus size={14} strokeWidth={2.5} />
        </button>
        <div
            role="button"
            tabIndex={0}
            className="flex items-center justify-center w-6 h-6 rounded-[5px] text-text-placeholder hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 ease-out cursor-grab active:cursor-grabbing"
            {...dragHandleProps}
        >
            <GripVertical size={14} strokeWidth={2} />
        </div>
    </div>
);

// ─── EditableDiv ──────────────────────────────────────────────────────────────
// A contentEditable div that syncs HTML from the store without clobbering
// the user's live input. Only updates the DOM when the element is NOT focused.

interface EditableDivProps {
    blockId: string;
    html: string;
    onSave: (html: string) => void;
    className?: string;
    placeholder?: string;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onInput?: (e: React.SyntheticEvent<HTMLDivElement>) => void;
}

const SAVE_BLOCK_EVENT = 'spore-save-block';

// document.execCommand is spec-deprecated but remains the only reliable cross-browser
// API for contentEditable rich-text formatting. It will not be removed from browsers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const execFormat = (cmd: string) => (document as any).execCommand(cmd);

const EditableDiv = React.forwardRef<HTMLDivElement, EditableDivProps>(
    ({ blockId, html, onSave, className, placeholder, onKeyDown, onInput }, forwardedRef) => {
        const innerRef = useRef<HTMLDivElement>(null);
        const onSaveRef = useRef(onSave);
        onSaveRef.current = onSave;

        // Sync HTML from store → DOM only when not focused
        useEffect(() => {
            const el = innerRef.current;
            if (!el) return;
            if (document.activeElement !== el && el.innerHTML !== html) {
                el.innerHTML = html;
            }
        }, [html]);

        // Persist when toolbar or keyboard formatting is applied (without blur)
        useEffect(() => {
            const el = innerRef.current;
            if (!el) return;
            const handleSave = () => {
                onSaveRef.current(sanitizeHtml(el.innerHTML));
            };
            el.addEventListener(SAVE_BLOCK_EVENT, handleSave);
            return () => el.removeEventListener(SAVE_BLOCK_EVENT, handleSave);
        }, []);

        return (
            <div
                ref={(node) => {
                    (innerRef as React.RefObject<HTMLDivElement | null>).current = node;
                    if (typeof forwardedRef === 'function') forwardedRef(node);
                    else if (forwardedRef) (forwardedRef as React.RefObject<HTMLDivElement | null>).current = node;
                }}
                id={blockId}
                contentEditable
                suppressContentEditableWarning
                data-block-editable="true"
                className={cn('outline-none block-content relative', className)}
                data-placeholder={placeholder}
                onKeyDown={onKeyDown}
                onInput={onInput}
                onBlur={e => onSave(sanitizeHtml(e.currentTarget.innerHTML))}
            />
        );
    }
);
EditableDiv.displayName = 'EditableDiv';

// ─── Code Block ───────────────────────────────────────────────────────────────

const CodeBlock = ({
    block,
    updateBlock,
}: {
    block: IBlock;
    updateBlock: (id: string, updates: Partial<IBlock>) => void;
}) => {
    const [copied, setCopied] = useState(false);
    const code = block.properties.code || '';
    const lineCount = code.split('\n').length;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-2 rounded-[8px] overflow-hidden border border-border-default" style={{ background: '#1E1E2E' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <select
                    value={block.properties.language || 'Plain Text'}
                    onChange={e => updateBlock(block.id, { properties: { language: e.target.value } })}
                    className="text-[12px] bg-transparent outline-none cursor-pointer"
                    style={{ color: '#9BA3B2' }}
                >
                    {CODE_LANGUAGES.map(lang => (
                        <option key={lang} value={lang} style={{ background: '#1E1E2E', color: '#CDD6F4' }}>
                            {lang}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 transition-colors"
                    style={{ color: copied ? '#A6E3A1' : '#9BA3B2' }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span className="text-[12px]">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>
            <textarea
                value={code}
                onChange={e => updateBlock(block.id, { properties: { code: e.target.value } })}
                className="w-full bg-transparent text-[13px] leading-[1.7] font-mono p-4 outline-none resize-none"
                style={{ color: '#CDD6F4' }}
                placeholder="// Start typing..."
                rows={Math.max(3, lineCount + 1)}
                spellCheck={false}
            />
        </div>
    );
};

// ─── Media Uploader ───────────────────────────────────────────────────────────

interface MediaUploaderProps {
    block: IBlock;
    updateBlock: (id: string, updates: Partial<IBlock>) => void;
    accept: string;
    mediaType: 'image' | 'video' | 'audio' | 'file';
    icon: React.ElementType;
    label: string;
    hint: string;
}

const MediaUploader = ({ block, updateBlock, accept, mediaType, icon: Icon, label, hint }: MediaUploaderProps) => {
    const [tab, setTab] = useState<'upload' | 'link'>('upload');
    const [linkInput, setLinkInput] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        updateBlock(block.id, { properties: { url, fileName: file.name, fileSize: file.size, mimeType: file.type } });
    };

    const handleLinkEmbed = () => {
        const url = linkInput.trim();
        if (url) updateBlock(block.id, { properties: { url } });
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (block.properties.url) {
        if (mediaType === 'image') {
            return (
                <div className="py-2 my-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={block.properties.url}
                        alt={block.properties.caption || 'Uploaded image'}
                        className="max-w-full rounded-[6px] select-none"
                        draggable={false}
                    />
                    <ContentEditablePlain
                        id={`${block.id}-caption`}
                        value={block.properties.caption ?? ''}
                        placeholder="Add a caption"
                        className="text-center text-[12px] text-text-muted mt-1.5 outline-none empty:before:content-['Add_a_caption'] empty:before:text-text-placeholder"
                        onBlur={(text) => updateBlock(block.id, { properties: { caption: text } })}
                    />
                </div>
            );
        }
        if (mediaType === 'video') {
            return (
                <div className="py-2 my-1">
                    <video src={block.properties.url} controls className="max-w-full rounded-[6px]" />
                    <ContentEditablePlain
                        id={`${block.id}-caption-video`}
                        value={block.properties.caption ?? ''}
                        placeholder="Add a caption"
                        className="text-center text-[12px] text-text-muted mt-1.5 outline-none empty:before:content-['Add_a_caption'] empty:before:text-text-placeholder"
                        onBlur={(text) => updateBlock(block.id, { properties: { caption: text } })}
                    />
                </div>
            );
        }
        if (mediaType === 'audio') {
            return (
                <div className="py-2 my-1">
                    <audio src={block.properties.url} controls className="w-full" />
                    <ContentEditablePlain
                        id={`${block.id}-caption-audio`}
                        value={block.properties.caption ?? ''}
                        placeholder="Add a caption"
                        className="text-center text-[12px] text-text-muted mt-1.5 outline-none empty:before:content-['Add_a_caption'] empty:before:text-text-placeholder"
                        onBlur={(text) => updateBlock(block.id, { properties: { caption: text } })}
                    />
                </div>
            );
        }
        // file
        return (
            <div className="py-1 my-1">
                <a
                    href={block.properties.url}
                    download={block.properties.fileName}
                    className="group/file flex items-center gap-3 p-3 rounded-[8px] border border-border-default bg-bg-secondary hover:bg-bg-hover transition-colors max-w-[480px]"
                >
                    <div className="w-9 h-9 rounded-[6px] bg-accent-blue-soft flex items-center justify-center shrink-0">
                        <Paperclip size={16} className="text-accent-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-text-primary truncate">
                            {block.properties.fileName || 'Download file'}
                        </p>
                        {block.properties.fileSize !== undefined && (
                            <p className="text-[12px] text-text-muted">{formatSize(block.properties.fileSize)}</p>
                        )}
                    </div>
                    <ExternalLink size={14} className="text-text-placeholder group-hover/file:text-text-secondary transition-colors shrink-0" />
                </a>
            </div>
        );
    }

    return (
        <div className="my-1 rounded-[8px] border border-border-default overflow-hidden">
            <div className="flex border-b border-border-default bg-bg-secondary">
                {(['upload', 'link'] as const).map(t => (
                    <button
                        key={t}
                        className={cn(
                            'px-4 py-2 text-[12.5px] font-medium transition-colors',
                            tab === t
                                ? 'text-text-primary bg-bg-primary border-b-2 border-text-primary -mb-px'
                                : 'text-text-muted hover:text-text-secondary'
                        )}
                        onClick={() => setTab(t)}
                    >
                        {t === 'upload' ? 'Upload' : 'Embed link'}
                    </button>
                ))}
            </div>
            {tab === 'upload' ? (
                <label className="flex flex-col items-center justify-center py-8 bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-[8px] bg-bg-hover border border-border-default flex items-center justify-center mb-3">
                        <Icon size={18} className="text-text-muted" />
                    </div>
                    <span className="text-[13px] font-medium text-text-secondary">{label}</span>
                    <span className="text-[11.5px] text-text-placeholder mt-1">{hint}</span>
                    <input type="file" accept={accept} className="hidden" onChange={handleFileUpload} />
                </label>
            ) : (
                <div className="flex items-center gap-2 px-4 py-3 bg-bg-secondary">
                    <input
                        type="url"
                        placeholder="Paste a URL..."
                        value={linkInput}
                        onChange={e => setLinkInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLinkEmbed()}
                        autoFocus
                        className="flex-1 text-[13px] bg-bg-primary border border-border-default rounded-[6px] px-3 py-1.5 outline-none text-text-primary placeholder:text-text-placeholder focus:border-accent-blue transition-colors"
                    />
                    <button
                        onClick={handleLinkEmbed}
                        className="px-3 py-1.5 text-[12px] font-medium bg-accent-blue text-white rounded-[6px] hover:bg-accent-blue-hover transition-colors shrink-0"
                    >
                        Embed
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Bookmark Block ────────────────────────────────────────────────────────────

const BookmarkBlock = ({
    block,
    updateBlock,
}: {
    block: IBlock;
    updateBlock: (id: string, updates: Partial<IBlock>) => void;
}) => {
    const [urlInput, setUrlInput] = useState('');

    const handleSave = () => {
        const url = urlInput.trim();
        if (url) updateBlock(block.id, { properties: { url, bookmarkTitle: url } });
    };

    if (block.properties.url) {
        return (
            <a
                href={block.properties.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/bm flex items-start gap-4 p-4 rounded-[8px] border border-border-default hover:bg-bg-hover transition-colors my-1"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary truncate">
                        {block.properties.bookmarkTitle || block.properties.url}
                    </p>
                    {block.properties.bookmarkDescription && (
                        <p className="text-[12px] text-text-muted mt-1 line-clamp-2">
                            {block.properties.bookmarkDescription}
                        </p>
                    )}
                    <p className="text-[12px] text-accent-blue mt-1.5 truncate">{block.properties.url}</p>
                </div>
                <ExternalLink size={14} className="text-text-placeholder group-hover/bm:text-text-secondary shrink-0 mt-0.5 transition-colors" />
            </a>
        );
    }

    return (
        <div className="my-1 rounded-[8px] border border-border-default bg-bg-secondary p-3 flex items-center gap-2">
            <Bookmark size={14} className="text-text-muted shrink-0" />
            <input
                type="url"
                placeholder="Paste a URL to create a bookmark..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
                className="flex-1 text-[13px] bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
            />
            <button
                onClick={handleSave}
                className="px-3 py-1 text-[12px] font-medium bg-accent-blue text-white rounded-[5px] hover:bg-accent-blue-hover transition-colors shrink-0"
            >
                Bookmark
            </button>
        </div>
    );
};

// ─── Embed Block ──────────────────────────────────────────────────────────────

const EmbedBlock = ({
    block,
    updateBlock,
}: {
    block: IBlock;
    updateBlock: (id: string, updates: Partial<IBlock>) => void;
}) => {
    const [urlInput, setUrlInput] = useState('');
    const handleEmbed = () => {
        const url = urlInput.trim();
        if (url) updateBlock(block.id, { properties: { url } });
    };

    if (block.properties.url) {
        return (
            <div className="my-1 rounded-[8px] border border-border-default overflow-hidden">
                <iframe
                    src={block.properties.url}
                    className="w-full border-0"
                    style={{ height: 400 }}
                    sandbox="allow-scripts allow-popups allow-forms"
                    loading="lazy"
                    title="Embedded content"
                />
            </div>
        );
    }

    return (
        <div className="my-1 rounded-[8px] border border-border-default bg-bg-secondary p-3 flex items-center gap-2">
            <Globe size={14} className="text-text-muted shrink-0" />
            <input
                type="url"
                placeholder="Paste any URL to embed..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmbed()}
                autoFocus
                className="flex-1 text-[13px] bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
            />
            <button
                onClick={handleEmbed}
                className="px-3 py-1 text-[12px] font-medium bg-accent-blue text-white rounded-[5px] hover:bg-accent-blue-hover transition-colors shrink-0"
            >
                Embed
            </button>
        </div>
    );
};

// ─── Page Icon ────────────────────────────────────────────────────────────────

const PAGE_ICONS = ['📄', '📝', '📊', '🗂️', '🎯', '🚀', '💡', '🔍', '⚙️', '🌱', '🎨', '💻', '📅', '🔖', '✅', '🧩'];

const PageIcon = ({
    icon,
    onSelect,
}: {
    icon?: string;
    onSelect: (emoji: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const emoji = icon || '';
    const isEmoji = emoji.length > 0 && !/^[A-Za-z]/.test(emoji);

    if (!isEmoji && !open) return null;

    if (isEmoji) {
        return (
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="text-[52px] leading-none hover:opacity-80 transition-opacity mb-2 select-none"
                    title="Change icon"
                >
                    {emoji}
                </button>
                {open && (
                    <div className="absolute top-full left-0 mt-1 z-30 bg-bg-elevated border border-border-default rounded-[10px] shadow-lg p-2 flex flex-wrap gap-1 w-[240px]">
                        {PAGE_ICONS.map(e => (
                            <button
                                key={e}
                                onClick={() => { onSelect(e); setOpen(false); }}
                                className="w-8 h-8 flex items-center justify-center text-[20px] hover:bg-bg-hover rounded-[5px] transition-colors"
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

// ─── Page title editable (no React children to avoid contentEditable warning) ─

const PageTitleEditable = ({
    value,
    onBlur,
    onEnter,
}: { value: string; onBlur: (title: string) => void; onEnter: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (document.activeElement !== el && el.textContent !== value) el.textContent = value;
    }, [value]);
    return (
        <div
            ref={ref}
            className="text-[40px] font-bold text-text-primary tracking-[-0.5px] leading-[1.2] outline-none mb-1 page-title-editable empty:before:content-['Untitled'] empty:before:text-text-placeholder"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onBlur(e.currentTarget.textContent ?? '')}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
        />
    );
};

// ─── Plain text contentEditable (no React children) ───────────────────────────

const ContentEditablePlain = ({
    id,
    value,
    placeholder,
    className,
    onKeyDown,
    onBlur,
    ...rest
}: {
    id: string;
    value: string;
    placeholder?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onBlur: (text: string) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onBlur' | 'contentEditable' | 'suppressContentEditableWarning'>) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (document.activeElement !== el && el.textContent !== value) el.textContent = value;
    }, [value]);
    return (
        <div
            ref={ref}
            id={id}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className={className}
            onKeyDown={onKeyDown}
            onBlur={(e) => onBlur(e.currentTarget.textContent ?? '')}
            {...rest}
        />
    );
};

// ─── Focus helper ─────────────────────────────────────────────────────────────

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

// ─── Main BlockRenderer ───────────────────────────────────────────────────────

const BlockRendererInner: React.FC<BlockRendererProps> = ({ blockId, depth = 0, dragHandleProps }) => {
    const block = useWorkspaceStore((state) => state.blocks[blockId]);
    // Do NOT subscribe to the full blocks map — use getState() for point-in-time reads
    // so that edits to sibling blocks don't re-render this component.
    const getBlocks = () => useWorkspaceStore.getState().blocks;
    const updateBlock = useWorkspaceStore((state) => state.updateBlock);
    const addBlock = useWorkspaceStore((state) => state.addBlock);
    const deleteBlock = useWorkspaceStore((state) => state.deleteBlock);

    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
    const [cmdPos, setCmdPos] = useState({ x: 0, y: 0 });

    if (!block) return null;

    // ── Slash-command position helper ──────────────────────────────────────────
    const getCaretPos = (el: HTMLElement): { x: number; y: number } => {
        try {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const rect = selection.getRangeAt(0).cloneRange().getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) return { x: rect.left, y: rect.bottom + 6 };
            }
        } catch { /* fall through */ }
        const rect = el.getBoundingClientRect();
        return { x: rect.left, y: rect.bottom + 6 };
    };

    // ── Add block below ────────────────────────────────────────────────────────
    const addBlockBelow = (type: IBlock['type'] = 'text') => {
        const newId = uuidv4();
        const isPageBlock = block.type === 'page';
        const parentId = isPageBlock ? block.id : block.parent_id;

        addBlock({
            id: newId,
            type,
            properties: { text: '' },
            content: [],
            parent_id: parentId,
            created_time: Date.now(),
            last_edited_time: Date.now(),
        });

        if (isPageBlock) {
            updateBlock(block.id, { content: [...(block.content ?? []), newId] });
        } else if (block.parent_id) {
            const parent = useWorkspaceStore.getState().blocks[block.parent_id];
            if (parent) {
                const idx = (parent.content ?? []).indexOf(block.id);
                const newContent = [...(parent.content ?? [])];
                newContent.splice(idx + 1, 0, newId);
                updateBlock(parent.id, { content: newContent });
            }
        }
        setTimeout(() => focusBlockEnd(newId), 10);
        return newId;
    };

    const { setDocumentSelectAll } = useDocumentSelectAll();

    // ── Key handler ────────────────────────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        // Cmd+Shift+A / Ctrl+Shift+A: Select all document — next format applies to every block
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            setDocumentSelectAll(true);
            return;
        }
        // Cmd+A / Ctrl+A: Select All in current block — do not prevent; native behavior
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') return;

        // ── Inline formatting shortcuts (persist immediately so format is never lost) ─
        if (e.metaKey || e.ctrlKey) {
            const el = e.currentTarget as HTMLElement;
            const persist = () => el.dispatchEvent(new CustomEvent(SAVE_BLOCK_EVENT, { bubbles: false }));
            if (e.key === 'b') { e.preventDefault(); execFormat('bold'); persist(); return; }
            if (e.key === 'i') { e.preventDefault(); execFormat('italic'); persist(); return; }
            if (e.key === 'u') { e.preventDefault(); execFormat('underline'); persist(); return; }
            if (e.key === 'e') { e.preventDefault(); execFormat('strikeThrough'); persist(); return; }
        }

        // ── Tab / Shift+Tab: indent / outdent list items ──────────────────────────
        if (e.key === 'Tab') {
            const isList = (LIST_TYPES as readonly string[]).includes(block.type);
            if (!isList || !block.parent_id) return;
            e.preventDefault();

            if (e.shiftKey) {
                // Outdent: lift block up to grandparent level, placed after current parent
                const parent = getBlocks()[block.parent_id];
                if (!parent || !parent.parent_id) return;
                const freshParent = useWorkspaceStore.getState().blocks[parent.id];
                const freshGrandparent = useWorkspaceStore.getState().blocks[parent.parent_id];
                if (!freshParent || !freshGrandparent) return;

                updateBlock(parent.id, { content: freshParent.content.filter((id) => id !== block.id) });
                const parentIdx = freshGrandparent.content.indexOf(parent.id);
                const newGpContent = [...freshGrandparent.content];
                newGpContent.splice(parentIdx + 1, 0, block.id);
                updateBlock(freshGrandparent.id, { content: newGpContent });
                updateBlock(block.id, { parent_id: freshGrandparent.id });
            } else {
                // Indent: nest under previous sibling
                const freshParent = useWorkspaceStore.getState().blocks[block.parent_id];
                if (!freshParent) return;
                const idx = freshParent.content.indexOf(block.id);
                if (idx <= 0) return;

                const prevSiblingId = freshParent.content[idx - 1];
                const freshPrev = useWorkspaceStore.getState().blocks[prevSiblingId];
                if (!freshPrev) return;

                updateBlock(block.parent_id, { content: freshParent.content.filter((id) => id !== block.id) });
                updateBlock(prevSiblingId, { content: [...freshPrev.content, block.id] });
                updateBlock(block.id, { parent_id: prevSiblingId });
            }

            setTimeout(() => focusBlockEnd(block.id), 10);
            return;
        }

        // ── Escape ─────────────────────────────────────────────────────────────
        if (e.key === 'Escape') {
            setIsCommandMenuOpen(false);
            setDocumentSelectAll(false);
            return;
        }

        // ── Slash command trigger ──────────────────────────────────────────────
        if (e.key === '/') {
            e.preventDefault();
            setCmdPos(getCaretPos(e.currentTarget));
            setIsCommandMenuOpen(true);
            return;
        }

        // ── Backspace on empty block ───────────────────────────────────────────
        if (e.key === 'Backspace') {
            const el = e.currentTarget as HTMLElement;
            const isEmpty = el.innerText.replace(/\n/g, '').trim() === '';
            if (isEmpty && block.parent_id) {
                // If it's a list type, convert to plain text instead of deleting
                const isList = (LIST_TYPES as readonly string[]).includes(block.type);
                if (isList) {
                    e.preventDefault();
                    updateBlock(block.id, { type: 'text', properties: { text: '' } });
                    setTimeout(() => {
                        const el2 = document.getElementById(block.id);
                        if (el2) el2.focus();
                    }, 10);
                    return;
                }
                // Otherwise delete the block and focus previous
                e.preventDefault();
                const parent = getBlocks()[block.parent_id];
                if (parent) {
                    const content = parent.content ?? [];
                    const idx = content.indexOf(block.id);
                    const prevId = idx > 0 ? content[idx - 1] : null;
                    deleteBlock(block.id, block.parent_id);
                    if (prevId) {
                        setTimeout(() => focusBlockEnd(prevId), 0);
                    }
                }
                return;
            }
        }

        // ── Enter ──────────────────────────────────────────────────────────────
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (isCommandMenuOpen) return;

            const el = e.currentTarget as HTMLElement;
            const isEmpty = el.innerText.replace(/\n/g, '').trim() === '';
            const isList = (LIST_TYPES as readonly string[]).includes(block.type);

            // Empty list item → convert to plain text (Notion-style list exit)
            if (isEmpty && isList) {
                updateBlock(block.id, { type: 'text', properties: { text: '' } });
                setTimeout(() => {
                    const el2 = document.getElementById(block.id);
                    if (el2) el2.focus();
                }, 10);
                return;
            }

            // Create a new block of the same type for list continuity
            const continueType = isList ? block.type : 'text';
            addBlockBelow(continueType);
        }
    };

    // ── Input handler — markdown shortcuts ────────────────────────────────────
    // Only fires on text blocks. Detects prefix patterns (# , - , 1. , etc.)
    // typed at the start of an empty block and converts the block type in-place.
    const handleInput = (e: React.SyntheticEvent<HTMLElement>) => {
        const el = e.currentTarget as HTMLElement;
        if (block.type !== 'text') return;

        // Normalize non-breaking spaces inserted by some browsers
        const text = (el.innerText ?? '').replace(/\u00A0/g, ' ');

        type Transform = { pattern: RegExp; type: IBlock['type']; extra?: IBlock['properties'] };
        const transforms: Transform[] = [
            { pattern: /^# $/,    type: 'h1' },
            { pattern: /^## $/,   type: 'h2' },
            { pattern: /^### $/,  type: 'h3' },
            { pattern: /^[-*] $/, type: 'bulleted_list_item' },
            { pattern: /^1\. $/,  type: 'numbered_list_item' },
            { pattern: /^> $/,    type: 'quote' },
            { pattern: /^\[\] $/, type: 'to_do' },
            { pattern: /^\[ \] $/, type: 'to_do' },
            {
                pattern: /^> $/,
                type: 'quote',
            },
            {
                pattern: /^```$/,
                type: 'code',
                extra: { code: '' },
            },
        ];

        for (const { pattern, type, extra = {} } of transforms) {
            if (pattern.test(text)) {
                el.innerHTML = '';
                updateBlock(block.id, { type, properties: { text: '', ...extra } });
                setTimeout(() => focusBlockEnd(block.id), 10);
                return;
            }
        }

        // Divider shortcut: --- on its own line
        if (text.trim() === '---') {
            el.innerHTML = '';
            updateBlock(block.id, { type: 'divider', properties: {} });
            addBlockBelow('text');
        }
    };

    // ── Command select ─────────────────────────────────────────────────────────
    const handleCommandSelect = (type: IBlock['type']) => {
        setIsCommandMenuOpen(false);

        const currentText = block.properties.text || '';
        const extraProps: IBlock['properties'] = {};
        if (type === 'code') extraProps.code = '';
        else if (type === 'equation') extraProps.expression = '';
        else if (type === 'callout') {
            extraProps.text = currentText;
            extraProps.calloutIcon = block.properties.calloutIcon || '💡';
            extraProps.calloutColor = block.properties.calloutColor || 'gray';
        }

        const isNonText = ['image', 'video', 'audio', 'file', 'bookmark', 'embed', 'divider'].includes(type);
        updateBlock(block.id, {
            type,
            properties: isNonText ? {} : { ...block.properties, text: '', ...extraProps },
        });

        if (!isNonText && type !== 'code') {
            setTimeout(() => focusBlockEnd(block.id), 10);
        }
    };

    // ── Children renderer ──────────────────────────────────────────────────────
    const renderChildren = () => {
        const allBlocks = getBlocks();
        const content = block.content ?? [];
        const validIds = content.filter((id) => allBlocks[id]);
        if (validIds.length === 0) return null;
        return (
            <div className={cn('flex flex-col', depth > 0 && 'ml-6')}>
                {validIds.map((childId) => (
                    <BlockRenderer key={childId} blockId={childId} depth={depth + 1} />
                ))}
            </div>
        );
    };

    // ── Numbered list index ────────────────────────────────────────────────────
    const getNumberedIndex = (): number => {
        if (!block.parent_id) return 1;
        const allBlocks = getBlocks();
        const parentContent = allBlocks[block.parent_id]?.content ?? [];
        const myIdx = parentContent.indexOf(block.id);
        let num = 0;
        for (let i = 0; i <= myIdx; i++) {
            if (allBlocks[parentContent[i]]?.type === 'numbered_list_item') num++;
        }
        return num;
    };

    // ── Common editable props ──────────────────────────────────────────────────
    const editableBase = (placeholder?: string) => ({
        blockId: block.id,
        html: block.properties.text || '',
        onSave: (html: string) => updateBlock(block.id, { properties: { text: sanitizeHtml(html) } }),
        placeholder,
        onKeyDown: handleKeyDown,
        onInput: handleInput,
    });

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <React.Fragment>
            {isCommandMenuOpen && (
                <SlashCommandMenu
                    x={cmdPos.x}
                    y={cmdPos.y}
                    onSelect={handleCommandSelect}
                    onClose={() => setIsCommandMenuOpen(false)}
                />
            )}

            {(() => {
                switch (block.type) {

                    // ── Page ──────────────────────────────────────────────────────────
                    case 'page': {
                        const hasContent = (block.content ?? []).length > 0;
                        return (
                            <div className="group flex flex-col w-full pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className="flex flex-col w-full max-w-[720px] mx-auto pt-16 pb-40 px-4">
                                    {/* Icon */}
                                    <PageIcon
                                    icon={block.properties.icon}
                                    onSelect={(emoji) => updateBlock(block.id, { properties: { icon: emoji } })}
                                />

                                {/* Title — no React children to avoid contentEditable warning */}
                                <PageTitleEditable
                                    value={block.properties.title ?? ''}
                                    onBlur={(title) => updateBlock(block.id, { properties: { title } })}
                                    onEnter={() => {
                                        if (hasContent && (block.content ?? []).length > 0) {
                                            focusBlockEnd((block.content ?? [])[0]);
                                        } else {
                                            addBlockBelow('text');
                                        }
                                    }}
                                />

                                {/* Hint when page is empty */}
                                {!hasContent && (
                                    <p className="text-[15px] text-text-placeholder mt-4 select-none pointer-events-none">
                                        Press Enter to start writing, or &apos;/&apos; for commands
                                    </p>
                                )}

                                    {/* Content */}
                                    <div className="flex flex-col mt-2">
                                        {renderChildren()}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // ── H1 ────────────────────────────────────────────────────────────
                    case 'h1':
                        return (
                            <div className="group flex relative pl-10 mt-8 mb-1">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <EditableDiv
                                    {...editableBase('Heading 1')}
                                    className={cn(
                                        'text-[30px] font-bold text-text-primary leading-[1.2] tracking-[-0.3px] flex-1',
                                        'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                    )}
                                />
                            </div>
                        );

                    // ── H2 ────────────────────────────────────────────────────────────
                    case 'h2':
                        return (
                            <div className="group flex relative pl-10 mt-6 mb-0.5">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <EditableDiv
                                    {...editableBase('Heading 2')}
                                    className={cn(
                                        'text-[22px] font-semibold text-text-primary leading-[1.3] tracking-[-0.2px] flex-1',
                                        'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                    )}
                                />
                            </div>
                        );

                    // ── H3 ────────────────────────────────────────────────────────────
                    case 'h3':
                        return (
                            <div className="group flex relative pl-10 mt-4 mb-0.5">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <EditableDiv
                                    {...editableBase('Heading 3')}
                                    className={cn(
                                        'text-[17px] font-semibold text-text-primary leading-[1.4] flex-1',
                                        'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                    )}
                                />
                            </div>
                        );

                    // ── Text ──────────────────────────────────────────────────────────
                    case 'text':
                        return (
                            <div className="group flex flex-col relative pl-10 py-[1px] min-h-[1.6em]">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <EditableDiv
                                    {...editableBase("Type '/' for commands")}
                                    className={cn(
                                        'text-[15px] leading-[1.65] text-text-primary flex-1',
                                        'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                    )}
                                />
                                {renderChildren()}
                            </div>
                        );

                    // ── To-do ─────────────────────────────────────────────────────────
                    case 'to_do':
                        return (
                            <div className="group flex flex-col relative pl-10 py-[1px]">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow('to_do')} />
                                <div className="flex items-start gap-2">
                                    <button
                                        className={cn(
                                            'mt-[4px] flex items-center justify-center w-[16px] h-[16px] rounded-[4px] border shrink-0 transition-all',
                                            block.properties.checked
                                                ? 'bg-accent-blue border-accent-blue text-white'
                                                : 'border-border-default hover:border-text-muted hover:bg-bg-hover'
                                        )}
                                        onClick={() => updateBlock(block.id, { properties: { checked: !block.properties.checked } })}
                                    >
                                        {block.properties.checked && <Check size={11} strokeWidth={3} />}
                                    </button>
                                    <EditableDiv
                                        {...editableBase('To-do')}
                                        className={cn(
                                            'flex-1 text-[15px] leading-[1.65] min-h-[1.6em]',
                                            block.properties.checked ? 'text-text-muted line-through' : 'text-text-primary',
                                            'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                        )}
                                    />
                                </div>
                                {renderChildren()}
                            </div>
                        );

                    // ── Bulleted list ─────────────────────────────────────────────────
                    case 'bulleted_list_item':
                        return (
                            <div className="group flex flex-col relative pl-10 py-[1px]">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow('bulleted_list_item')} />
                                <div className="flex items-start gap-2">
                                    <div className="w-[16px] h-[calc(15px*1.65)] flex items-center justify-center shrink-0 mt-[1px]">
                                        <div className="w-[5px] h-[5px] rounded-full bg-text-primary/60" />
                                    </div>
                                    <EditableDiv
                                        {...editableBase('List item')}
                                        className={cn(
                                            'flex-1 text-[15px] leading-[1.65] text-text-primary min-h-[1.6em]',
                                            'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                        )}
                                    />
                                </div>
                                {renderChildren()}
                            </div>
                        );

                    // ── Numbered list ─────────────────────────────────────────────────
                    case 'numbered_list_item':
                        return (
                            <div className="group flex flex-col relative pl-10 py-[1px]">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow('numbered_list_item')} />
                                <div className="flex items-start gap-2">
                                    <div className="w-[20px] flex items-start justify-start shrink-0 pt-[2px]">
                                        <span className="text-[15px] leading-[1.65] text-text-primary/60 select-none tabular-nums">
                                            {getNumberedIndex()}.
                                        </span>
                                    </div>
                                    <EditableDiv
                                        {...editableBase('List item')}
                                        className={cn(
                                            'flex-1 text-[15px] leading-[1.65] text-text-primary min-h-[1.6em]',
                                            'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                        )}
                                    />
                                </div>
                                {renderChildren()}
                            </div>
                        );

                    // ── Toggle ────────────────────────────────────────────────────────
                    case 'toggle': {
                        const isOpen = block.properties.open !== false;
                        return (
                            <div className="group flex flex-col relative pl-10 py-[1px]">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className="flex items-start gap-1">
                                    <button
                                        type="button"
                                        className="w-5 h-[calc(15px*1.65)] flex items-center justify-center shrink-0 text-text-muted hover:text-text-primary transition-colors mt-[1px]"
                                        onClick={() => updateBlock(block.id, { properties: { open: !isOpen } })}
                                    >
                                        <ChevronRight
                                            size={14}
                                            className={cn('transition-transform duration-150', isOpen && 'rotate-90')}
                                        />
                                    </button>
                                    <EditableDiv
                                        {...editableBase('Toggle')}
                                        className={cn(
                                            'flex-1 text-[15px] leading-[1.65] text-text-primary font-medium min-h-[1.6em]',
                                            'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                        )}
                                    />
                                </div>
                                {isOpen && block.content.length > 0 && (
                                    <div className="ml-5 mt-0.5 border-l-2 border-border-light pl-3">
                                        {renderChildren()}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // ── Quote ─────────────────────────────────────────────────────────
                    case 'quote':
                        return (
                            <div className="group flex relative pl-10 py-1 my-1">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className="flex items-stretch gap-3 flex-1">
                                    <div className="w-[3px] rounded-full bg-text-muted shrink-0" />
                                    <EditableDiv
                                        {...editableBase('Quote...')}
                                        className={cn(
                                            'flex-1 text-[15px] italic text-text-secondary leading-[1.65] min-h-[1.6em]',
                                            'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                        )}
                                    />
                                </div>
                                <Quote size={13} className="absolute right-0 top-2 text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        );

                    // ── Callout ───────────────────────────────────────────────────────
                    case 'callout': {
                        const colorKey = block.properties.calloutColor || 'gray';
                        const color = CALLOUT_COLORS[colorKey] ?? CALLOUT_COLORS.gray;
                        return (
                            <div className="group relative pl-10 my-1">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className={cn('relative p-3.5 rounded-[8px] border', color.bg, color.border)}>
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-[18px] leading-[1.65] shrink-0 select-none cursor-default">
                                            {block.properties.calloutIcon || '💡'}
                                        </span>
                                        <EditableDiv
                                            {...editableBase('Write something...')}
                                            className={cn(
                                                'flex-1 text-[15px] text-text-primary leading-[1.65] min-h-[1.6em]',
                                                'empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:absolute empty:before:pointer-events-none',
                                            )}
                                        />
                                    </div>
                                    {/* Color picker — responds to outer group hover */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-bg-elevated border border-border-default rounded-[6px] p-1 shadow-sm">
                                        {Object.entries(CALLOUT_COLORS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                title={key}
                                                onClick={() => updateBlock(block.id, { properties: { calloutColor: key } })}
                                                className={cn(
                                                    'w-3.5 h-3.5 rounded-full transition-transform hover:scale-110',
                                                    colorKey === key && 'ring-2 ring-offset-1 ring-text-muted'
                                                )}
                                                style={{ backgroundColor: val.swatch }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // ── Code ──────────────────────────────────────────────────────────
                    case 'code':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <CodeBlock block={block} updateBlock={updateBlock} />
                            </div>
                        );

                    // ── Equation ──────────────────────────────────────────────────────
                    case 'equation':
                        return (
                            <div className="group flex relative pl-10 my-2 py-3 px-4 rounded-[8px] bg-bg-secondary border border-border-default">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className="flex flex-col items-center w-full gap-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sigma size={13} className="text-text-muted" />
                                        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Equation</span>
                                    </div>
                                    <ContentEditablePlain
                                        id={block.id}
                                        value={block.properties.expression ?? ''}
                                        placeholder="e = mc²"
                                        className="w-full text-[15px] font-mono text-text-primary text-center outline-none min-h-[24px] leading-[1.6] empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder empty:before:pointer-events-none"
                                        data-block-editable="true"
                                        onKeyDown={handleKeyDown}
                                        onBlur={(text) => updateBlock(block.id, { properties: { expression: text } })}
                                    />
                                    <span className="text-[11px] text-text-placeholder mt-1">LaTeX — rendered in export</span>
                                </div>
                            </div>
                        );

                    // ── Divider ───────────────────────────────────────────────────────
                    case 'divider':
                        return (
                            <div className="group flex relative pl-10 py-3 my-1 items-center">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <div className="flex-1 h-px bg-border-default" />
                            </div>
                        );

                    // ── Image ─────────────────────────────────────────────────────────
                    case 'image':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <MediaUploader block={block} updateBlock={updateBlock} accept="image/*" mediaType="image" icon={ImageIcon} label="Upload an image" hint="PNG, JPG, GIF, WebP, SVG" />
                            </div>
                        );

                    // ── Video ─────────────────────────────────────────────────────────
                    case 'video':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <MediaUploader block={block} updateBlock={updateBlock} accept="video/*" mediaType="video" icon={Video} label="Upload a video" hint="MP4, WebM, MOV, AVI" />
                            </div>
                        );

                    // ── Audio ─────────────────────────────────────────────────────────
                    case 'audio':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <MediaUploader block={block} updateBlock={updateBlock} accept="audio/*" mediaType="audio" icon={Music} label="Upload an audio file" hint="MP3, WAV, OGG, FLAC" />
                            </div>
                        );

                    // ── File ──────────────────────────────────────────────────────────
                    case 'file':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <MediaUploader block={block} updateBlock={updateBlock} accept="*/*" mediaType="file" icon={Paperclip} label="Upload a file" hint="PDF, DOCX, XLSX, ZIP, and more" />
                            </div>
                        );

                    // ── Bookmark ──────────────────────────────────────────────────────
                    case 'bookmark':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <BookmarkBlock block={block} updateBlock={updateBlock} />
                            </div>
                        );

                    // ── Embed ─────────────────────────────────────────────────────────
                    case 'embed':
                        return (
                            <div className="group relative pl-10">
                                <DragHandle dragHandleProps={dragHandleProps} onAddBelow={() => addBlockBelow()} />
                                <EmbedBlock block={block} updateBlock={updateBlock} />
                            </div>
                        );

                    default:
                        return (
                            <div className="text-accent-red p-2 border border-accent-red-soft bg-accent-red-soft text-[13px] rounded-[6px]">
                                Unknown block type: {(block as IBlock).type}
                            </div>
                        );
                }
            })()}
        </React.Fragment>
    );
};

// Wrap in React.memo so that a block only re-renders when ITS OWN data changes,
// not when any other block in the workspace is edited.
export const BlockRenderer = React.memo(BlockRendererInner);
