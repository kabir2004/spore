'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PDFPageDimensions } from '@/lib/types/sign';
import { PDFPageCanvas } from './PDFPageCanvas';

export interface PDFDocumentViewProps {
    url: string;
    /** Max width per page (CSS pixels) */
    maxWidth?: number;
    /** Called when all page dimensions are known (one entry per page) */
    onDimensions?: (dims: PDFPageDimensions[]) => void;
    /** Called every time a single page renders or re-renders (e.g. on zoom change) */
    onPageDimensions?: (pageIndex: number, dims: PDFPageDimensions) => void;
    /** Called when user clicks on a page (viewport coordinates relative to that page's canvas) */
    onPageClick?: (pageIndex: number, x: number, y: number) => void;
    /** Render overlays for each page. Only called when dimensions for that page are set. */
    children?: (pageIndex: number, dimensions: PDFPageDimensions) => React.ReactNode;
    className?: string;
}

/** Minimal type for pdfjs PDFDocumentProxy to avoid importing pdfjs-dist on server */
interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNum: number): Promise<unknown>;
}

/**
 * Loads a PDF once and renders all pages as a vertical stack.
 * Each page draws itself when mounted so the canvas ref is always valid.
 */
export function PDFDocumentView({
    url,
    maxWidth = 720,
    onDimensions,
    onPageDimensions,
    onPageClick,
    children,
    className,
}: PDFDocumentViewProps) {
    const [numPages, setNumPages] = useState(0);
    const [dimensionsByPage, setDimensionsByPage] = useState<(PDFPageDimensions | null)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // MutableRefObject so we can assign pdfDocRef.current inside the effect
    const pdfDocRef = useRef(null) as React.MutableRefObject<PDFDocumentProxy | null>;
    const hasReportedDimensions = useRef(false);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        setLoading(true);
        setNumPages(0);
        setDimensionsByPage([]);
        hasReportedDimensions.current = false;

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
                const n = pdf.numPages;
                pdfDocRef.current = pdf;
                setNumPages(n);
                setDimensionsByPage(Array.from({ length: n }, () => null));
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
            pdfDocRef.current = null;
        };
    }, [url]);

    const onPageDimensionsRef = useRef(onPageDimensions);
    onPageDimensionsRef.current = onPageDimensions;

    const handlePageRendered = useCallback((pageIndex: number, dims: PDFPageDimensions) => {
        setDimensionsByPage((prev) => {
            const next = [...prev];
            next[pageIndex] = dims;
            return next;
        });
        onPageDimensionsRef.current?.(pageIndex, dims);
    }, []);

    useEffect(() => {
        const allReady = numPages > 0 && dimensionsByPage.length === numPages && dimensionsByPage.every(Boolean);
        if (allReady && !hasReportedDimensions.current) {
            hasReportedDimensions.current = true;
            setLoading(false);
            onDimensions?.(dimensionsByPage as PDFPageDimensions[]);
        }
    }, [numPages, dimensionsByPage, onDimensions]);

    if (error) {
        return (
            <div className={cn('flex items-center justify-center py-16 text-accent-red text-sm p-4', className)}>
                {error}
            </div>
        );
    }
    if (numPages === 0) {
        return (
            <div className={cn('flex items-center justify-center py-16 text-text-muted text-sm', className)}>
                Loading PDF…
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center gap-6', className)}>
            {Array.from({ length: numPages }, (_, pageIndex) => (
                <PDFPageCanvas
                    key={pageIndex}
                    pdfDocRef={pdfDocRef}
                    pageIndex={pageIndex}
                    maxWidth={maxWidth}
                    onRendered={handlePageRendered}
                    onCanvasClick={onPageClick ? (x, y) => onPageClick(pageIndex, x, y) : undefined}
                >
                    {dimensionsByPage[pageIndex] && children?.(pageIndex, dimensionsByPage[pageIndex]!)}
                </PDFPageCanvas>
            ))}
        </div>
    );
}
