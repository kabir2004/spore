'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, RotateCcw, PenLine, Type, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'draw' | 'type' | 'upload';

interface SignatureDrawModalProps {
    onDone: (dataUrl: string) => void;
    onCancel: () => void;
    /** Label for the modal — "Signature" or "Initials" */
    label?: string;
}

const CANVAS_W = 480;
const CANVAS_H = 180;

export function SignatureDrawModal({ onDone, onCancel, label = 'Signature' }: SignatureDrawModalProps) {
    const [tab, setTab] = useState<Tab>('draw');
    const [typedName, setTypedName] = useState('');
    const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const hasStrokesRef = useRef(false);

    // ── Draw tab ───────────────────────────────────────────────────────────────

    const getCtx = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#1A1A1A';
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
        return ctx ?? null;
    }, []);

    const getPointerPos = useCallback((e: PointerEvent | React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawingRef.current = true;
        hasStrokesRef.current = true;
        const ctx = getCtx();
        const { x, y } = getPointerPos(e);
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    }, [getCtx, getPointerPos]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        const ctx = getCtx();
        const { x, y } = getPointerPos(e);
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }, [getCtx, getPointerPos]);

    const handlePointerUp = useCallback(() => {
        isDrawingRef.current = false;
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasStrokesRef.current = false;
        }
    }, []);

    // Reset draw canvas when switching to draw tab
    useEffect(() => {
        if (tab === 'draw') clearCanvas();
    }, [tab, clearCanvas]);

    // ── Upload tab ─────────────────────────────────────────────────────────────

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_W;
                canvas.height = CANVAS_H;
                const ctx = canvas.getContext('2d')!;
                const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
                setUploadedDataUrl(canvas.toDataURL('image/png'));
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }, []);

    // ── Done handler ───────────────────────────────────────────────────────────

    const handleDone = useCallback(() => {
        if (tab === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas || !hasStrokesRef.current) return;
            onDone(canvas.toDataURL('image/png'));
        } else if (tab === 'type') {
            if (!typedName.trim()) return;
            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_W;
            canvas.height = CANVAS_H;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            // Use a cursive system font — italic Georgia/Palatino reads like a signature
            const fontSize = Math.min(64, Math.max(32, Math.floor(CANVAS_W / (typedName.length * 0.7))));
            ctx.font = `italic ${fontSize}px Georgia, 'Palatino Linotype', serif`;
            ctx.fillStyle = '#1A1A1A';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(typedName.trim(), CANVAS_W / 2, CANVAS_H / 2);
            onDone(canvas.toDataURL('image/png'));
        } else if (tab === 'upload') {
            if (!uploadedDataUrl) return;
            onDone(uploadedDataUrl);
        }
    }, [tab, typedName, uploadedDataUrl, onDone]);

    const canConfirm = tab === 'draw'
        ? hasStrokesRef.current
        : tab === 'type'
        ? typedName.trim().length > 0
        : uploadedDataUrl !== null;

    const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'draw', label: 'Draw', icon: <PenLine size={14} /> },
        { id: 'type', label: 'Type', icon: <Type size={14} /> },
        { id: 'upload', label: 'Upload', icon: <Upload size={14} /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
            <div className="bg-bg-primary rounded-xl shadow-2xl border border-border-default w-full max-w-[520px] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
                    <div>
                        <h3 className="text-[15px] font-semibold text-text-primary">Add {label}</h3>
                        <p className="text-[12px] text-text-muted mt-0.5">Draw, type, or upload your {label.toLowerCase()}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border-default px-5 gap-1">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px',
                                tab === t.id
                                    ? 'border-accent-blue text-accent-blue'
                                    : 'border-transparent text-text-muted hover:text-text-secondary'
                            )}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5">
                    {tab === 'draw' && (
                        <div className="flex flex-col gap-3">
                            <div className="relative rounded-xl border border-border-default bg-white overflow-hidden" style={{ height: 180 }}>
                                <canvas
                                    ref={canvasRef}
                                    width={CANVAS_W}
                                    height={CANVAS_H}
                                    className="w-full h-full touch-none cursor-crosshair block"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                />
                                {/* Baseline guide */}
                                <div
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: 24, right: 24,
                                        bottom: 40,
                                        borderBottom: '1px dashed rgba(0,0,0,0.12)',
                                    }}
                                />
                                <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-text-placeholder pointer-events-none select-none">
                                    Sign above the line
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 'type' && (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                                    Type your {label.toLowerCase()}
                                </label>
                                <input
                                    type="text"
                                    value={typedName}
                                    onChange={(e) => setTypedName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleDone(); }}
                                    placeholder="Your full name"
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-colors"
                                />
                            </div>
                            {/* Live preview in cursive */}
                            <div className="rounded-xl border border-border-default bg-white flex items-center justify-center" style={{ height: 120 }}>
                                {typedName.trim() ? (
                                    <span
                                        style={{
                                            fontFamily: "Georgia, 'Palatino Linotype', serif",
                                            fontStyle: 'italic',
                                            fontSize: Math.min(52, Math.max(24, Math.floor(320 / Math.max(typedName.length, 1)))),
                                            color: '#1A1A1A',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {typedName}
                                    </span>
                                ) : (
                                    <span className="text-[13px] text-text-placeholder select-none">Preview appears here</span>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'upload' && (
                        <div className="flex flex-col gap-3">
                            {uploadedDataUrl ? (
                                <div className="relative rounded-xl border border-border-default bg-white overflow-hidden flex items-center justify-center" style={{ height: 160 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={uploadedDataUrl}
                                        alt="Uploaded signature"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setUploadedDataUrl(null)}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-bg-secondary border border-border-default text-text-muted hover:text-accent-red transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-default bg-bg-secondary/50 hover:bg-bg-hover/50 hover:border-text-placeholder transition-colors cursor-pointer" style={{ height: 160 }}>
                                    <Upload size={24} className="text-text-muted" />
                                    <div className="text-center">
                                        <p className="text-[13px] text-text-secondary">Click to upload an image</p>
                                        <p className="text-[11px] text-text-muted mt-0.5">PNG, JPG, SVG · Transparent background recommended</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-border-default bg-bg-secondary/30">
                    <p className="text-[11px] text-text-muted">
                        By clicking Done you agree this is your legal {label.toLowerCase()}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDone}
                            disabled={!canConfirm}
                            className="px-4 py-1.5 text-[13px] font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: canConfirm ? '#6940A5' : undefined }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
