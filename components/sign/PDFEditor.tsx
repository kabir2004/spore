'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Type, PenLine, Calendar, Download, Check,
    User, Mail, CheckSquare, Fingerprint, X,
    FileText, ChevronRight, Minus, Plus,
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cn } from '@/lib/utils';
import type { SignAnnotation, SignAnnotationType, SignDocument, PDFPageDimensions } from '@/lib/types/sign';
import { v4 as uuidv4 } from 'uuid';
import { SignatureDrawModal } from './SignatureDrawModal';
import { viewportToPdf, getAnnotationOverlayStyle } from './pdfCoords';
import { PDFDocumentView } from './PDFDocumentView';

// ─── Constants ─────────────────────────────────────────────────────────────────

const BASE_PDF_WIDTH = 700;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP_BTN = 0.25;
const ZOOM_STEP_WHEEL = 0.05;
const SIDEBAR_OPEN_W = 240;
const SIDEBAR_CLOSED_W = 48;

function clampZoom(z: number) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 100) / 100));
}

// ─── Field Configuration ───────────────────────────────────────────────────────

interface FieldCfg {
    label: string;
    group: 'signing' | 'text' | 'other';
    Icon: React.ElementType;
    color: string;
    softBg: string;
    borderColor: string;
    defaultW: number;
    defaultH: number;
    placeholder: string;
}

const FIELD_CONFIG: Record<SignAnnotationType, FieldCfg> = {
    signature: {
        label: 'Signature', group: 'signing',
        Icon: PenLine, color: '#6940A5',
        softBg: 'rgba(105,64,165,0.08)', borderColor: 'rgba(105,64,165,0.35)',
        defaultW: 160, defaultH: 48, placeholder: 'Sign here',
    },
    initials: {
        label: 'Initials', group: 'signing',
        Icon: Fingerprint, color: '#D9730D',
        softBg: 'rgba(217,115,13,0.08)', borderColor: 'rgba(217,115,13,0.35)',
        defaultW: 72, defaultH: 40, placeholder: 'Initials',
    },
    date: {
        label: 'Date', group: 'signing',
        Icon: Calendar, color: '#0F7B6C',
        softBg: 'rgba(15,123,108,0.08)', borderColor: 'rgba(15,123,108,0.35)',
        defaultW: 100, defaultH: 16, placeholder: 'Date',
    },
    text: {
        label: 'Text', group: 'text',
        Icon: Type, color: '#2383E2',
        softBg: 'rgba(35,131,226,0.08)', borderColor: 'rgba(35,131,226,0.35)',
        defaultW: 130, defaultH: 16, placeholder: 'Text',
    },
    name: {
        label: 'Name', group: 'text',
        Icon: User, color: '#2383E2',
        softBg: 'rgba(35,131,226,0.08)', borderColor: 'rgba(35,131,226,0.35)',
        defaultW: 140, defaultH: 16, placeholder: 'Full Name',
    },
    email: {
        label: 'Email', group: 'text',
        Icon: Mail, color: '#AD1A72',
        softBg: 'rgba(173,26,114,0.08)', borderColor: 'rgba(173,26,114,0.35)',
        defaultW: 160, defaultH: 16, placeholder: 'Email Address',
    },
    checkbox: {
        label: 'Checkbox', group: 'other',
        Icon: CheckSquare, color: '#0F7B6C',
        softBg: 'rgba(15,123,108,0.08)', borderColor: 'rgba(15,123,108,0.35)',
        defaultW: 14, defaultH: 14, placeholder: '',
    },
};

const FIELD_GROUPS: { key: 'signing' | 'text' | 'other'; label: string }[] = [
    { key: 'signing', label: 'Signing' },
    { key: 'text', label: 'Text Fields' },
    { key: 'other', label: 'Other' },
];

const SIGNING_TYPES: SignAnnotationType[] = ['signature', 'initials'];

// ─── Drag State ────────────────────────────────────────────────────────────────

interface DragState {
    id: string;
    pageIndex: number;
    mode: 'move' | 'resize';
    startAnnX: number;
    startAnnY: number;
    startAnnW: number;
    startAnnH: number;
    startMouseX: number;
    startMouseY: number;
    dims: PDFPageDimensions;
}

// ─── Tooltip State ─────────────────────────────────────────────────────────────

interface TooltipState {
    label: string;
    count: number;
    x: number; // viewport X (right edge of the icon button)
    y: number; // viewport Y center
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PDFEditorProps {
    document: SignDocument;
    onUpdate: (annotations: SignAnnotation[]) => void;
    onAddDocument?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PDFEditor({ document: doc, onUpdate, onAddDocument }: PDFEditorProps) {
    const [activeTool, setActiveTool] = useState<SignAnnotationType | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [signatureModalFor, setSignatureModalFor] = useState<{ id: string; type: 'signature' | 'initials' } | null>(null);
    const [dimsByPage, setDimsByPage] = useState<PDFPageDimensions[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [zoom, setZoom] = useState(1.0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const maxWidth = Math.round(BASE_PDF_WIDTH * zoom);
    const pdfScrollRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;
    const annotationsRef = useRef(doc.annotations);
    annotationsRef.current = doc.annotations;

    // ── Per-page dims (zoom-aware) ─────────────────────────────────────────────
    const handlePageDimensions = useCallback((pageIndex: number, dims: PDFPageDimensions) => {
        setDimsByPage((prev) => {
            const next = [...prev];
            next[pageIndex] = dims;
            return next;
        });
    }, []);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom((p) => clampZoom(p + ZOOM_STEP_BTN)); return; }
            if (mod && e.key === '-') { e.preventDefault(); setZoom((p) => clampZoom(p - ZOOM_STEP_BTN)); return; }
            if (mod && e.key === '0') { e.preventDefault(); setZoom(1.0); return; }
            if (e.key === 'Escape') { setActiveTool(null); setSelectedId(null); setEditingId(null); return; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
                const t = e.target as HTMLElement;
                if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
                e.preventDefault();
                onUpdateRef.current(annotationsRef.current.filter((a) => a.id !== selectedId));
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [selectedId, editingId]);

    // ── Ctrl/Cmd + wheel zoom ──────────────────────────────────────────────────
    useEffect(() => {
        const el = pdfScrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setZoom((p) => clampZoom(p + (e.deltaY < 0 ? ZOOM_STEP_WHEEL : -ZOOM_STEP_WHEEL)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // ── Place annotation ───────────────────────────────────────────────────────
    const addAnnotation = useCallback(
        (pageIndex: number, viewportX: number, viewportY: number) => {
            if (!activeTool || !dimsByPage[pageIndex]) return;
            const dims = dimsByPage[pageIndex];
            const cfg = FIELD_CONFIG[activeTool];
            const { x, y } = viewportToPdf(viewportX, viewportY, dims, cfg.defaultH);
            const xC = Math.max(0, Math.min(dims.pageWidth - cfg.defaultW, x));
            const yC = Math.max(0, Math.min(dims.pageHeight - cfg.defaultH, y));
            const defaultValue = activeTool === 'date'
                ? new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })
                : activeTool === 'checkbox' ? 'false' : undefined;
            const ann: SignAnnotation = {
                id: uuidv4(), type: activeTool, pageIndex,
                x: xC, y: yC, width: cfg.defaultW, height: cfg.defaultH,
                value: defaultValue,
            };
            onUpdateRef.current([...annotationsRef.current, ann]);
            setActiveTool(null);
            setSelectedId(ann.id);
            if (SIGNING_TYPES.includes(activeTool as (typeof SIGNING_TYPES)[number])) {
                setSignatureModalFor({ id: ann.id, type: activeTool as 'signature' | 'initials' });
            } else if (activeTool !== 'checkbox') {
                setEditingId(ann.id);
            }
        },
        [activeTool, dimsByPage]
    );

    const updateAnnotation = useCallback((id: string, updates: Partial<SignAnnotation>) => {
        onUpdateRef.current(annotationsRef.current.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    }, []);

    const removeAnnotation = useCallback((id: string) => {
        onUpdateRef.current(annotationsRef.current.filter((a) => a.id !== id));
        setSelectedId((s) => (s === id ? null : s));
        setEditingId((s) => (s === id ? null : s));
    }, []);

    // ── Drag / Resize ──────────────────────────────────────────────────────────
    const handleAnnotationMouseDown = useCallback(
        (e: React.MouseEvent, id: string, mode: 'move' | 'resize') => {
            if (e.button !== 0) return;
            const ann = annotationsRef.current.find((a) => a.id === id);
            if (!ann || !dimsByPage[ann.pageIndex]) return;
            e.preventDefault();
            e.stopPropagation();
            dragRef.current = {
                id, pageIndex: ann.pageIndex, mode,
                startAnnX: ann.x, startAnnY: ann.y,
                startAnnW: ann.width, startAnnH: ann.height,
                startMouseX: e.clientX, startMouseY: e.clientY,
                dims: dimsByPage[ann.pageIndex],
            };
            setIsDragging(true);
            setSelectedId(id);
            setEditingId(null);
        },
        [dimsByPage]
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            const d = dragRef.current;
            if (!d) return;
            const { dims, mode, startAnnX, startAnnY, startAnnW, startAnnH, startMouseX, startMouseY, id } = d;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            const dPdfX = (dx / dims.viewportWidth) * dims.pageWidth;
            const dPdfY = (dy / dims.viewportHeight) * dims.pageHeight;
            let updates: Partial<SignAnnotation>;
            if (mode === 'move') {
                const ann = annotationsRef.current.find((a) => a.id === id);
                const w = ann?.width ?? startAnnW;
                const h = ann?.height ?? startAnnH;
                updates = {
                    x: Math.max(0, Math.min(dims.pageWidth - w, startAnnX + dPdfX)),
                    y: Math.max(0, Math.min(dims.pageHeight - h, startAnnY - dPdfY)),
                };
            } else {
                const newW = Math.max(10, startAnnW + dPdfX);
                const newH = Math.max(10, startAnnH + dPdfY);
                updates = { width: newW, height: newH, y: Math.max(0, startAnnY + startAnnH - newH) };
            }
            onUpdateRef.current(annotationsRef.current.map((a) => (a.id === id ? { ...a, ...updates } : a)));
        };
        const onUp = () => { dragRef.current = null; setIsDragging(false); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [isDragging]);

    // ── Export PDF ─────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        setSaveError(null);
        setSaving(true);
        try {
            const arrayBuffer = await doc.file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const pages = pdfDoc.getPages();
            for (const ann of doc.annotations) {
                if (ann.pageIndex >= pages.length) continue;
                const p = pages[ann.pageIndex];
                const fontSize = Math.max(8, Math.min(12, ann.height * 0.75));
                switch (ann.type) {
                    case 'signature': case 'initials':
                        if (ann.signatureDataUrl) {
                            try {
                                const imgBytes = await fetch(ann.signatureDataUrl).then((r) => r.arrayBuffer());
                                p.drawImage(await pdfDoc.embedPng(imgBytes), { x: ann.x, y: ann.y, width: ann.width, height: ann.height });
                            } catch { if (ann.value) p.drawText(ann.value, { x: ann.x, y: ann.y + 2, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) }); }
                        } else if (ann.value) { p.drawText(ann.value, { x: ann.x, y: ann.y + 2, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) }); }
                        break;
                    case 'text': case 'name': case 'email': case 'date':
                        if (ann.value) p.drawText(ann.value, { x: ann.x, y: ann.y + 2, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
                        break;
                    case 'checkbox':
                        p.drawRectangle({ x: ann.x, y: ann.y, width: ann.width, height: ann.height, borderColor: rgb(0.15, 0.15, 0.15), borderWidth: 1.2, color: rgb(1, 1, 1) });
                        if (ann.value === 'true') {
                            const pad = ann.width * 0.2;
                            p.drawLine({ start: { x: ann.x + pad, y: ann.y + pad }, end: { x: ann.x + ann.width - pad, y: ann.y + ann.height - pad }, thickness: 1.2, color: rgb(0.1, 0.1, 0.1) });
                            p.drawLine({ start: { x: ann.x + ann.width - pad, y: ann.y + pad }, end: { x: ann.x + pad, y: ann.y + ann.height - pad }, thickness: 1.2, color: rgb(0.1, 0.1, 0.1) });
                        }
                        break;
                }
            }
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = doc.name.replace(/\.pdf$/i, '') + '-signed.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to export');
        } finally {
            setSaving(false);
        }
    }, [doc]);

    // ── Annotation content ─────────────────────────────────────────────────────
    const renderAnnotationContent = (ann: SignAnnotation) => {
        const cfg = FIELD_CONFIG[ann.type];
        if (ann.type === 'signature' || ann.type === 'initials') {
            if (ann.signatureDataUrl) {
                return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ann.signatureDataUrl} alt={cfg.label}
                        className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                );
            }
            return (
                <button type="button"
                    className="w-full h-full flex items-center justify-center gap-1 text-[10px] font-medium hover:opacity-70 transition-opacity"
                    style={{ color: cfg.color }}
                    onClick={(e) => { e.stopPropagation(); setSignatureModalFor({ id: ann.id, type: ann.type as 'signature' | 'initials' }); }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <cfg.Icon size={10} />{cfg.placeholder}
                </button>
            );
        }
        if (ann.type === 'checkbox') {
            return (
                <button type="button" className="w-full h-full flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); updateAnnotation(ann.id, { value: ann.value === 'true' ? 'false' : 'true' }); }}
                    onMouseDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center rounded-[2px] transition-colors"
                        style={{ width: '65%', height: '65%', border: `1.5px solid ${cfg.color}`, background: ann.value === 'true' ? cfg.color : 'transparent' }}>
                        {ann.value === 'true' && <Check size={7} color="white" strokeWidth={3} />}
                    </div>
                </button>
            );
        }
        if (editingId === ann.id) {
            return (
                <input autoFocus type="text" value={ann.value ?? ''}
                    onChange={(e) => updateAnnotation(ann.id, { value: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null); e.stopPropagation(); }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-full px-1.5 bg-transparent border-none outline-none text-[11px]"
                    style={{ color: '#1A1A1A' }}
                    placeholder={cfg.placeholder}
                />
            );
        }
        return (
            <span className="w-full h-full flex items-center px-1.5 text-[11px] truncate select-none"
                style={{ color: ann.value ? '#1A1A1A' : cfg.color, cursor: 'text' }}
                onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); setEditingId(ann.id); }}>
                {ann.value || cfg.placeholder}
            </span>
        );
    };

    const totalPlaced = doc.annotations.length;
    const fieldEntries = Object.entries(FIELD_CONFIG) as [SignAnnotationType, FieldCfg][];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-bg-primary"
            onClick={() => { if (!activeTool) { setSelectedId(null); setEditingId(null); } }}>

            {/* ── Top Toolbar ── */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border-default bg-bg-primary shrink-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText size={15} className="text-text-muted shrink-0" />
                    <span className="text-[13px] font-medium text-text-primary truncate max-w-[280px]" title={doc.name}>{doc.name}</span>
                    {totalPlaced > 0 && (
                        <span className="shrink-0 text-[11px] text-text-muted bg-bg-hover px-2 py-0.5 rounded-full">
                            {totalPlaced} field{totalPlaced !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {saveError && <span className="text-[12px] text-accent-red max-w-[160px] truncate" title={saveError}>{saveError}</span>}
                    {onAddDocument && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onAddDocument(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors border border-border-default">
                            Add document
                        </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleSave(); }} disabled={saving}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-white transition-all disabled:opacity-50"
                        style={{ background: saving ? '#9B9B9B' : '#2383E2' }}>
                        <Download size={13} />
                        {saving ? 'Exporting…' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="flex flex-1 min-h-0">

                {/* ── Sidebar ── */}
                <div
                    className="shrink-0 border-r border-border-default bg-bg-primary flex flex-col overflow-hidden"
                    style={{
                        width: sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W,
                        transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                >
                    {/* Sidebar header — toggle lives here */}
                    <div
                        className="shrink-0 flex items-center border-b border-border-default"
                        style={{
                            padding: sidebarOpen ? '10px 12px 10px 14px' : '10px 0',
                            justifyContent: sidebarOpen ? 'space-between' : 'center',
                        }}
                    >
                        {sidebarOpen && (
                            <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-[0.08em]">
                                Fields
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSidebarOpen((o) => !o); setTooltip(null); }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <ChevronRight
                                size={14}
                                style={{
                                    transform: sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
                                }}
                            />
                        </button>
                    </div>

                    {/* ── OPEN: full palette ── */}
                    {sidebarOpen && (
                        <>
                            {/* Active tool indicator */}
                            {activeTool && (() => {
                                const cfg = FIELD_CONFIG[activeTool];
                                return (
                                    <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 shrink-0"
                                        style={{ background: cfg.softBg, border: `1px solid ${cfg.borderColor}` }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: cfg.color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold leading-tight" style={{ color: cfg.color }}>Click to place</p>
                                            <p className="text-[11px] leading-tight mt-0.5" style={{ color: cfg.color, opacity: 0.65 }}>
                                                {cfg.label} · Esc to cancel
                                            </p>
                                        </div>
                                        <button type="button"
                                            onClick={(e) => { e.stopPropagation(); setActiveTool(null); }}
                                            className="p-1 rounded-lg transition-colors shrink-0 hover:bg-black/5"
                                            style={{ color: cfg.color }}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Field palette */}
                            <div className="flex-1 overflow-y-auto py-2 px-2">
                                {FIELD_GROUPS.map(({ key, label }) => {
                                    const tools = fieldEntries.filter(([, cfg]) => cfg.group === key);
                                    const isCollapsed = collapsedGroups.has(key);
                                    const toggleCollapse = () => setCollapsedGroups((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(key)) next.delete(key); else next.add(key);
                                        return next;
                                    });
                                    return (
                                        <div key={key} className="mb-1">
                                            <button type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
                                                className="flex items-center gap-1.5 w-full px-2 py-1.5 mb-0.5 text-left rounded-md hover:bg-bg-hover transition-colors group">
                                                <ChevronRight size={11}
                                                    className="text-text-muted shrink-0 transition-transform duration-150 opacity-60 group-hover:opacity-100"
                                                    style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                                                />
                                                <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-[0.07em]">
                                                    {label}
                                                </span>
                                            </button>
                                            {!isCollapsed && (
                                                <div className="flex flex-col gap-px mb-2">
                                                    {tools.map(([type, cfg]) => {
                                                        const isActive = activeTool === type;
                                                        const count = doc.annotations.filter((a) => a.type === type).length;
                                                        return (
                                                            <button key={type} type="button"
                                                                onClick={(e) => { e.stopPropagation(); setActiveTool(isActive ? null : type); setSelectedId(null); setEditingId(null); }}
                                                                className={cn('flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg transition-all text-left', isActive ? 'bg-bg-active' : 'hover:bg-bg-hover')}>
                                                                <div className="flex items-center justify-center rounded-md shrink-0 transition-colors"
                                                                    style={{ width: 24, height: 24, background: isActive ? cfg.color : cfg.softBg }}>
                                                                    <cfg.Icon size={13} style={{ color: isActive ? 'white' : cfg.color }} />
                                                                </div>
                                                                <span className={cn('text-[13px] flex-1 truncate', isActive ? 'text-text-primary font-medium' : 'text-text-secondary')}>
                                                                    {cfg.label}
                                                                </span>
                                                                {count > 0 && (
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 tabular-nums"
                                                                        style={{ background: isActive ? 'rgba(255,255,255,0.22)' : cfg.softBg, color: isActive ? 'white' : cfg.color }}>
                                                                        {count}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {totalPlaced === 0 && !activeTool && (
                                    <p className="px-3 mt-1 text-[11px] text-text-muted leading-relaxed">
                                        Select a field above, then click anywhere on the document to place it.
                                    </p>
                                )}
                            </div>

                            {/* Placed fields list */}
                            {totalPlaced > 0 && (
                                <div className="shrink-0 border-t border-border-default px-2 py-3">
                                    <p className="text-[10.5px] font-semibold text-text-muted uppercase tracking-[0.07em] px-2 mb-1.5">
                                        Placed · {totalPlaced}
                                    </p>
                                    <div className="flex flex-col gap-px max-h-[180px] overflow-y-auto">
                                        {doc.annotations.map((ann) => {
                                            const cfg = FIELD_CONFIG[ann.type];
                                            const isSelected = selectedId === ann.id;
                                            return (
                                                <div key={ann.id} role="button" tabIndex={0}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); setActiveTool(null); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(ann.id); setActiveTool(null); } }}
                                                    className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors', isSelected ? 'bg-bg-active' : 'hover:bg-bg-hover')}>
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                                                    <span className="text-[12px] text-text-secondary flex-1 truncate">{cfg.label}</span>
                                                    <span className="text-[10px] text-text-muted shrink-0 tabular-nums">p.{ann.pageIndex + 1}</span>
                                                    <button type="button"
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all text-text-muted hover:text-accent-red"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}>
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CLOSED: icon strip ── */}
                    {!sidebarOpen && (
                        <div className="flex-1 flex flex-col items-center py-2 gap-0.5 overflow-y-auto">
                            {FIELD_GROUPS.map(({ key }, groupIdx) => {
                                const tools = fieldEntries.filter(([, cfg]) => cfg.group === key);
                                return (
                                    <React.Fragment key={key}>
                                        {groupIdx > 0 && (
                                            <div className="w-5 my-1" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />
                                        )}
                                        {tools.map(([type, cfg]) => {
                                            const isActive = activeTool === type;
                                            const count = doc.annotations.filter((a) => a.type === type).length;
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setActiveTool(isActive ? null : type); setSelectedId(null); setEditingId(null); }}
                                                    onMouseEnter={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTooltip({ label: cfg.label, count, x: rect.right, y: rect.top + rect.height / 2 });
                                                    }}
                                                    onMouseLeave={() => setTooltip(null)}
                                                    className="relative flex items-center justify-center rounded-lg transition-all"
                                                    style={{
                                                        width: 32, height: 32,
                                                        background: isActive ? cfg.color : cfg.softBg,
                                                        outline: isActive ? `2px solid ${cfg.color}` : 'none',
                                                        outlineOffset: 2,
                                                    }}
                                                    aria-label={cfg.label}
                                                >
                                                    <cfg.Icon size={14} style={{ color: isActive ? 'white' : cfg.color }} />
                                                    {/* Count badge */}
                                                    {count > 0 && (
                                                        <span
                                                            className="absolute flex items-center justify-center rounded-full font-bold tabular-nums"
                                                            style={{
                                                                top: -4, right: -4,
                                                                width: 14, height: 14,
                                                                fontSize: 8,
                                                                background: cfg.color,
                                                                color: 'white',
                                                                border: '1.5px solid #fff',
                                                            }}
                                                        >
                                                            {count > 9 ? '9+' : count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}

                            {/* Placed count indicator at bottom */}
                            {totalPlaced > 0 && (
                                <div className="mt-auto pt-2 pb-1 flex flex-col items-center gap-0.5">
                                    <div className="w-5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />
                                    <span
                                        className="text-[10px] font-semibold tabular-nums mt-1"
                                        style={{ color: '#9B9B9B' }}
                                        title={`${totalPlaced} field${totalPlaced !== 1 ? 's' : ''} placed`}
                                    >
                                        {totalPlaced}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Tooltip (fixed — escapes overflow:hidden sidebar) ── */}
                {!sidebarOpen && tooltip && (
                    <div
                        className="pointer-events-none select-none"
                        style={{
                            position: 'fixed',
                            left: tooltip.x + 8,
                            top: tooltip.y,
                            transform: 'translateY(-50%)',
                            zIndex: 9999,
                        }}
                    >
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium shadow-lg"
                            style={{ background: '#1A1A1A', color: 'white', whiteSpace: 'nowrap' }}
                        >
                            {/* Left arrow */}
                            <div style={{
                                position: 'absolute',
                                right: '100%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 0, height: 0,
                                borderTop: '5px solid transparent',
                                borderBottom: '5px solid transparent',
                                borderRight: '6px solid #1A1A1A',
                            }} />
                            {tooltip.label}
                            {tooltip.count > 0 && (
                                <span className="opacity-50 text-[11px]">
                                    · {tooltip.count}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PDF area ── */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div
                        ref={pdfScrollRef}
                        className="flex-1 overflow-y-auto overflow-x-auto"
                        style={{
                            background: '#E8E8E6',
                            cursor: isDragging ? 'grabbing' : activeTool ? 'crosshair' : 'default',
                        }}
                    >
                        <div className="flex flex-col items-center py-8 px-6 gap-6">
                            <PDFDocumentView
                                url={doc.url}
                                maxWidth={maxWidth}
                                onPageDimensions={handlePageDimensions}
                                onPageClick={activeTool ? (pageIndex, x, y) => addAnnotation(pageIndex, x, y) : undefined}
                            >
                                {(pageIndex, dimensions) => (
                                    <>
                                        {doc.annotations
                                            .filter((ann) => ann.pageIndex === pageIndex)
                                            .map((ann) => {
                                                const cfg = FIELD_CONFIG[ann.type];
                                                const style = getAnnotationOverlayStyle(ann, dimensions);
                                                const isSelected = selectedId === ann.id;
                                                const isSmall = ann.type === 'checkbox';
                                                return (
                                                    <div key={ann.id} className="absolute"
                                                        style={{ left: style.left, top: style.top, width: style.width, height: style.height, overflow: 'visible' }}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); setActiveTool(null); }}>
                                                        <div className="absolute inset-0 rounded-[3px] transition-shadow"
                                                            style={{
                                                                background: cfg.softBg,
                                                                border: `1.5px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? cfg.color : cfg.borderColor}`,
                                                                boxShadow: isSelected ? `0 0 0 3px ${cfg.softBg}` : undefined,
                                                                cursor: isDragging ? 'grabbing' : 'grab',
                                                            }}
                                                            onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id, 'move')}>
                                                            {renderAnnotationContent(ann)}
                                                        </div>
                                                        {isSelected && (
                                                            <button type="button"
                                                                className="absolute flex items-center justify-center bg-white border border-red-200 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                                                style={{ top: -10, right: -10, width: 20, height: 20, zIndex: 30 }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}>
                                                                <X size={10} className="text-red-500" />
                                                            </button>
                                                        )}
                                                        {isSelected && !isSmall && (
                                                            <div className="absolute rounded-sm"
                                                                style={{
                                                                    bottom: 0, right: 0,
                                                                    width: 10, height: 10,
                                                                    background: cfg.color,
                                                                    cursor: 'nwse-resize',
                                                                    zIndex: 30,
                                                                }}
                                                                onMouseDown={(e) => { e.stopPropagation(); handleAnnotationMouseDown(e, ann.id, 'resize'); }} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </>
                                )}
                            </PDFDocumentView>
                        </div>
                    </div>

                    {/* ── Status bar + zoom controls ── */}
                    <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border-default bg-bg-primary select-none">
                        <p className="text-[11px] text-text-muted">
                            {dimsByPage.filter(Boolean).length} page{dimsByPage.filter(Boolean).length !== 1 ? 's' : ''} ·{' '}
                            <kbd className="px-1 py-px text-[10px] bg-bg-secondary border border-border-default rounded font-mono">Esc</kbd>{' '}cancel ·{' '}
                            <kbd className="px-1 py-px text-[10px] bg-bg-secondary border border-border-default rounded font-mono">⌫</kbd>{' '}delete ·{' '}
                            <kbd className="px-1 py-px text-[10px] bg-bg-secondary border border-border-default rounded font-mono">⌘0</kbd>{' '}reset zoom
                        </p>
                        <div className="flex items-center gap-0.5 bg-bg-secondary border border-border-default rounded-lg px-1 py-0.5">
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); setZoom((p) => clampZoom(p - ZOOM_STEP_BTN)); }}
                                disabled={zoom <= MIN_ZOOM}
                                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Zoom out (⌘−)">
                                <Minus size={12} />
                            </button>
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); setZoom(1.0); }}
                                className="min-w-[46px] text-center px-1.5 py-0.5 text-[11px] font-mono text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                                title="Reset zoom to 100% (⌘0)">
                                {Math.round(zoom * 100)}%
                            </button>
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); setZoom((p) => clampZoom(p + ZOOM_STEP_BTN)); }}
                                disabled={zoom >= MAX_ZOOM}
                                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Zoom in (⌘+)">
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signature / Initials modal */}
            {signatureModalFor && (
                <SignatureDrawModal
                    label={FIELD_CONFIG[signatureModalFor.type].label}
                    onDone={(dataUrl) => { updateAnnotation(signatureModalFor.id, { signatureDataUrl: dataUrl }); setSignatureModalFor(null); }}
                    onCancel={() => setSignatureModalFor(null)}
                />
            )}
        </div>
    );
}
