'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type DocumentSelectAllContextValue = {
    documentSelectAll: boolean;
    setDocumentSelectAll: (value: boolean) => void;
};

const DocumentSelectAllContext = createContext<DocumentSelectAllContextValue>({
    documentSelectAll: false,
    setDocumentSelectAll: () => {},
});

export function useDocumentSelectAll() {
    return useContext(DocumentSelectAllContext);
}

export function DocumentSelectAllProvider({ children }: { children: React.ReactNode }) {
    const [documentSelectAll, setDocumentSelectAll] = useState(false);
    return (
        <DocumentSelectAllContext.Provider value={{ documentSelectAll, setDocumentSelectAll }}>
            {children}
        </DocumentSelectAllContext.Provider>
    );
}

/** Event dispatched when user applies a format while "document select all" is active. */
export const SPORE_APPLY_FORMAT_TO_ALL = 'spore-apply-format-to-all';

export type ApplyFormatToAllDetail =
    | { type: 'execCommand'; command: string }
    | { type: 'font'; fontId: string }
    | { type: 'textColor'; colorId: string }
    | { type: 'highlight'; colorId: string };

export function dispatchApplyFormatToAll(detail: ApplyFormatToAllDetail) {
    window.dispatchEvent(new CustomEvent(SPORE_APPLY_FORMAT_TO_ALL, { detail }));
}
