'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PDFPageDimensions } from '@/lib/types/sign';

// Re-export for convenience (coords are in pdfCoords.ts to avoid loading pdfjs on server)
export { viewportToPdf, getAnnotationOverlayStyle } from './pdfCoords';

interface PDFCanvasViewProps {
    /** Blob URL or URL of the PDF */
    url: string;
    /** Max width for the rendered page (CSS pixels) */
    maxWidth?: number;
    /** Called when the page is rendered and dimensions are known */
    onDimensions?: (dims: PDFPageDimensions) => void;
    /** Optional class for the wrapper */
    className?: string;
    /** Optional: callback when click happens (clientX, clientY relative to canvas top-left in CSS pixels) */
    onCanvasClick?: (x: number, y: number) => void;
    /** Ref to attach to the canvas wrapper for coordinate conversion */
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function PDFCanvasView({
    url,
    maxWidth = 720,
    onDimensions,
    className,
    onCanvasClick,
    containerRef: containerRefProp,
}: PDFCanvasViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = containerRefProp ?? wrapperRef;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dimsRef = useRef<PDFPageDimensions | null>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const canvas = canvasRef.current;
            const dims = dimsRef.current;
            if (!canvas || !dims || !onCanvasClick) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                onCanvasClick(x, y);
            }
        },
        [onCanvasClick]
    );

    useEffect(() => {
        let cancelled = false;
        setError(null);
        setLoading(true);

        const load = async () => {
            const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
            if (typeof window !== 'undefined') {
                GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
            }
            try {
                const data = await fetch(url).then((r) => r.arrayBuffer());
                if (cancelled) return;
                const pdf = await getDocument({ data }).promise;
                if (cancelled) return;
                const page = await pdf.getPage(1);
                const viewportScale1 = page.getViewport({ scale: 1 });
                const pageWidth = viewportScale1.width;
                const pageHeight = viewportScale1.height;
                const scale = maxWidth / pageWidth;
                const viewport = page.getViewport({ scale });
                const viewportWidth = viewport.width;
                const viewportHeight = viewport.height;

                dimsRef.current = {
                    pageWidth,
                    pageHeight,
                    viewportWidth,
                    viewportHeight,
                };
                onDimensions?.(dimsRef.current);

                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = Math.floor(viewportWidth * dpr);
                canvas.height = Math.floor(viewportHeight * dpr);
                canvas.style.width = `${viewportWidth}px`;
                canvas.style.height = `${viewportHeight}px`;
                canvas.style.direction = 'ltr';
                canvas.setAttribute('dir', 'ltr');

                const ctx = canvas.getContext('2d');
                if (!ctx || cancelled) return;
                ctx.scale(dpr, dpr);
                await page.render({
                    canvasContext: ctx,
                    viewport,
                    canvas,
                }).promise;
                if (!cancelled) setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load PDF');
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [url, maxWidth, onDimensions]);

    return (
        <div
            ref={containerRef}
            className={cn('relative', className)}
            onClick={onCanvasClick ? handleClick : undefined}
            style={onCanvasClick ? { cursor: 'crosshair' } : undefined}
        >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary text-text-muted text-sm">
                    Loading…
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary text-accent-red text-sm p-4">
                    {error}
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="block max-w-full h-auto"
                style={{ visibility: loading || error ? 'hidden' : 'visible' }}
            />
        </div>
    );
}
