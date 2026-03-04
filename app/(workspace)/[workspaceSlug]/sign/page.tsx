'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { X, Type, Calendar, Shield, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/shared/AppLogo';
import { UploadZone } from '@/components/sign/UploadZone';
import { PDFEditor } from '@/components/sign/PDFEditor';
import type { SignDocument } from '@/lib/types/sign';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function SignPage() {
    const [documents, setDocuments] = useState<SignDocument[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Revoke blob URLs on unmount
    useEffect(() => {
        return () => {
            documents.forEach((d) => {
                if (d?.url?.startsWith('blob:')) URL.revokeObjectURL(d.url);
            });
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFiles = useCallback((files: File[]) => {
        setUploadError(null);
        const valid: SignDocument[] = [];
        for (const file of files) {
            if (file.type !== 'application/pdf') continue;
            if (file.size > MAX_FILE_BYTES) {
                setUploadError(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB — skipped.`);
                continue;
            }
            valid.push({
                id: uuidv4(),
                name: file.name,
                file,
                url: URL.createObjectURL(file),
                annotations: [],
                createdAt: Date.now(),
            });
        }
        if (valid.length === 0 && !uploadError) setUploadError('No valid PDFs found. PDF only, max 20 MB.');
        setDocuments((prev) => [...prev, ...valid]);
        if (valid.length > 0) setSelectedId((sid) => sid ?? valid[0].id);
    }, [uploadError]);

    const removeDocument = useCallback((id: string) => {
        setDocuments((prev) => {
            const doc = prev.find((d) => d.id === id);
            if (doc?.url?.startsWith('blob:')) URL.revokeObjectURL(doc.url);
            return prev.filter((d) => d.id !== id);
        });
        setSelectedId((sid) => (sid === id ? null : sid));
    }, []);

    // Keep selectedId valid
    useEffect(() => {
        if (documents.length > 0 && (!selectedId || !documents.some((d) => d.id === selectedId))) {
            setSelectedId(documents[0].id);
        }
    }, [documents, selectedId]);

    const selectedDoc = documents.find((d) => d.id === selectedId);

    const updateAnnotations = useCallback(
        (id: string) => (annotations: SignDocument['annotations']) => {
            setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, annotations } : d)));
        },
        []
    );

    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // ── Empty state ────────────────────────────────────────────────────────────
    if (documents.length === 0) {
        return (
            <div className="absolute inset-0 flex items-center justify-center w-full px-6 py-12">
                <div className="flex flex-col items-center text-center max-w-[440px] w-full">
                    {/* Logo */}
                    <div className="mb-8 w-16 h-16 rounded-2xl bg-bg-elevated border border-border-default flex items-center justify-center shadow-sm">
                        <AppLogo size={32} className="text-text-primary" />
                    </div>

                    <h1 className="text-[24px] font-bold tracking-tight text-text-primary mb-2">
                        Sign documents
                    </h1>
                    <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
                        Upload → Edit → Download
                    </p>

                    <UploadZone onFiles={handleFiles} className="w-full" />

                    {uploadError && (
                        <p className="mt-3 text-[13px] text-accent-red">{uploadError}</p>
                    )}

                    {/* Feature pills */}
                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                        {[
                            { Icon: CheckCircle, label: 'Signatures & Initials' },
                            { Icon: Type, label: 'Text Fields' },
                            { Icon: Calendar, label: 'Date Fields' },
                            { Icon: Shield, label: 'Stays in your workspace' },
                        ].map(({ Icon, label }) => (
                            <div
                                key={label}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-secondary border border-border-default text-[12px] text-text-secondary"
                            >
                                <Icon size={12} className="text-text-muted" />
                                {label}
                            </div>
                        ))}
                    </div>

                    <p className="mt-6 text-[12px] text-text-muted">PDF only · Max 20 MB per file</p>
                </div>
            </div>
        );
    }

    // ── Editor view ────────────────────────────────────────────────────────────
    // Use absolute positioning to escape PageTransition's unbound height.
    // `main` in WorkspaceShell has position:relative, so inset-0 fills exactly
    // viewport-minus-topbar without relying on h-full propagation.
    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
            {/* Document tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-bg-primary shrink-0 overflow-x-auto">
                <span className="text-[12px] font-medium text-text-muted shrink-0">Documents</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={cn(
                                'flex items-center gap-0 rounded-lg border overflow-hidden shrink-0 transition-colors',
                                selectedId === doc.id
                                    ? 'border-accent-blue/40 bg-accent-blue-soft'
                                    : 'border-border-default bg-bg-secondary hover:bg-bg-hover'
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedId(doc.id)}
                                className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-[12px] transition-colors text-left"
                            >
                                <span
                                    className={cn(
                                        'shrink-0 w-[14px] h-[14px] flex items-center justify-center',
                                        selectedId === doc.id ? 'text-accent-blue' : 'text-text-muted'
                                    )}
                                >
                                    <AppLogo size={12} />
                                </span>
                                <span
                                    className={cn(
                                        'truncate max-w-[160px]',
                                        selectedId === doc.id ? 'text-accent-blue font-medium' : 'text-text-secondary'
                                    )}
                                >
                                    {doc.name}
                                </span>
                                {doc.annotations.length > 0 && (
                                    <span className={cn('text-[10px] shrink-0', selectedId === doc.id ? 'text-accent-blue/70' : 'text-text-muted')}>
                                        {doc.annotations.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                                className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red-soft transition-colors"
                                aria-label={`Remove ${doc.name}`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Hidden file input for "Add document" in toolbar */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.length) handleFiles(Array.from(e.target.files));
                        e.target.value = '';
                    }}
                />
            </div>

            {/* Editor */}
            {selectedDoc && (
                <div className="flex-1 min-h-0 overflow-hidden">
                    <PDFEditor
                        document={selectedDoc}
                        onUpdate={updateAnnotations(selectedDoc.id)}
                        onAddDocument={openFilePicker}
                    />
                </div>
            )}

            {uploadError && (
                <div className="shrink-0 px-4 py-2 bg-accent-red-soft border-t border-accent-red/20 text-[12px] text-accent-red">
                    {uploadError}
                </div>
            )}
        </div>
    );
}
