/**
 * Types for the in-house Sign (DocuSign-style) module.
 */

export type SignAnnotationType =
    | 'text'
    | 'signature'
    | 'initials'
    | 'date'
    | 'name'
    | 'email'
    | 'checkbox';

export interface SignAnnotation {
    id: string;
    type: SignAnnotationType;
    pageIndex: number;
    /** X in PDF points (left edge, bottom-left origin) */
    x: number;
    /** Y in PDF points (bottom edge, bottom-left origin) */
    y: number;
    /** Width in PDF points */
    width: number;
    /** Height in PDF points */
    height: number;
    /** Text value for text/date/name/email fields */
    value?: string;
    /** PNG data URL for signature and initials fields */
    signatureDataUrl?: string;
}

export interface SignDocument {
    id: string;
    name: string;
    file: File;
    /** Blob URL for display — revoke on unmount */
    url: string;
    annotations: SignAnnotation[];
    createdAt: number;
}

/** Page size in PDF points and rendered viewport size in CSS pixels */
export interface PDFPageDimensions {
    pageWidth: number;
    pageHeight: number;
    viewportWidth: number;
    viewportHeight: number;
}
