import type { PDFPageDimensions } from '@/lib/types/sign';

/** Convert canvas (viewport) pixel position to PDF coordinates (bottom-left origin, points) */
export function viewportToPdf(
    viewportX: number,
    viewportY: number,
    dims: PDFPageDimensions,
    fieldHeightPoints: number
): { x: number; y: number } {
    const { pageWidth, pageHeight, viewportWidth, viewportHeight } = dims;
    const x = (viewportX / viewportWidth) * pageWidth;
    const y = pageHeight - (viewportY / viewportHeight) * pageHeight - fieldHeightPoints;
    return { x, y };
}

/** Convert PDF coordinates to viewport (canvas) pixel position for overlay (top-left of field) */
export function getAnnotationOverlayStyle(
    ann: { x: number; y: number; width: number; height: number },
    dims: PDFPageDimensions
): { left: number; top: number; width: number; height: number } {
    const { pageWidth, pageHeight, viewportWidth, viewportHeight } = dims;
    return {
        left: (ann.x / pageWidth) * viewportWidth,
        top: (1 - (ann.y + ann.height) / pageHeight) * viewportHeight,
        width: (ann.width / pageWidth) * viewportWidth,
        height: (ann.height / pageHeight) * viewportHeight,
    };
}
