'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PDFPageDimensions } from '@/lib/types/sign';

/** Minimal type for pdfjs PDFDocumentProxy to avoid importing pdfjs-dist on server */
interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNum: number): Promise<unknown>;
}

/** Minimal type for pdfjs page (getViewport, render) - used for type assertion after getPage() */
interface PDFPageProxy {
    getViewport(opts: { scale: number }): { width: number; height: number };
    render(params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
}

export interface PDFPageCanvasProps {
    /** Shared loaded PDF document (from parent) */
    pdfDocRef: React.RefObject<PDFDocumentProxy | null>;
    pageIndex: number;
    maxWidth: number;
    /** Called when this page has been rendered. Passed (pageIndex, dims). */
    onRendered: (pageIndex: number, dims: PDFPageDimensions) => void;
    onCanvasClick?: (x: number, y: number) => void;
    children?: React.ReactNode;
    className?: string;
}

/**
 * Renders a single PDF page to a canvas. Draws when mounted and pdfDocRef.current is set.
 * This ensures the canvas ref exists before we draw (each page draws itself).
 */
export function PDFPageCanvas({
    pdfDocRef,
    pageIndex,
    maxWidth,
    onRendered,
    onCanvasClick,
    children,
    className,
}: PDFPageCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dims, setDims] = useState<PDFPageDimensions | null>(null);
    const onRenderedRef = useRef(onRendered);
    onRenderedRef.current = onRendered;

    useEffect(() => {
        const pdf = pdfDocRef.current;
        const canvas = canvasRef.current;
        if (!pdf || !canvas) return;

        let cancelled = false;
        const dpr = window.devicePixelRatio || 1;

        const draw = async () => {
            try {
                const page = (await pdf.getPage(pageIndex + 1)) as PDFPageProxy;
                const viewportScale1 = page.getViewport({ scale: 1 });
                const pageWidth = viewportScale1.width;
                const pageHeight = viewportScale1.height;
                const scale = maxWidth / pageWidth;
                const viewport = page.getViewport({ scale });
                const viewportWidth = viewport.width;
                const viewportHeight = viewport.height;

                if (cancelled) return;
                canvas.width = Math.floor(viewportWidth * dpr);
                canvas.height = Math.floor(viewportHeight * dpr);
                canvas.style.width = `${viewportWidth}px`;
                canvas.style.height = `${viewportHeight}px`;

                const ctx = canvas.getContext('2d');
                if (!ctx || cancelled) return;
                ctx.scale(dpr, dpr);
                await page.render({
                    canvasContext: ctx,
                    viewport,
                }).promise;

                if (cancelled) return;
                const pageDims: PDFPageDimensions = {
                    pageWidth,
                    pageHeight,
                    viewportWidth,
                    viewportHeight,
                };
                setDims(pageDims);
                onRenderedRef.current(pageIndex, pageDims);
            } catch (err) {
                if (!cancelled) console.error('PDF page render error:', err);
            }
        };

        draw();
        return () => {
            cancelled = true;
        };
    }, [pdfDocRef, pageIndex, maxWidth]); // onRendered called once when done; omit from deps to avoid re-drawing when parent re-renders

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onCanvasClick || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            onCanvasClick(x, y);
        }
    };

    return (
        <div
            className={cn('relative bg-bg-secondary border border-border-light rounded-lg overflow-hidden shadow-sm', className)}
            onClick={onCanvasClick ? handleClick : undefined}
            style={onCanvasClick ? { cursor: 'crosshair' } : undefined}
        >
            <canvas
                ref={canvasRef}
                className="block"
                style={{ direction: 'ltr' }}
            />
            {dims && children}
        </div>
    );
}
