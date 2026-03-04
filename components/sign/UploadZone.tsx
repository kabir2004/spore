'use client';

import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
    onFiles: (files: File[]) => void;
    accept?: string;
    className?: string;
}

export function UploadZone({ onFiles, accept = '.pdf,application/pdf', className }: UploadZoneProps) {
    const [drag, setDrag] = useState(false);

    const handleFiles = useCallback(
        (list: FileList | null) => {
            if (!list?.length) return;
            const files = Array.from(list).filter((f) => f.type === 'application/pdf');
            if (files.length) onFiles(files);
        },
        [onFiles]
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDrag(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setDrag(false);
    }, []);

    return (
        <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed transition-colors cursor-pointer min-h-[120px] px-6 py-8',
                drag
                    ? 'border-accent-blue bg-accent-blue-soft/50'
                    : 'border-border-default bg-bg-secondary/50 hover:border-text-placeholder hover:bg-bg-hover/50',
                className
            )}
        >
            <Upload size={20} className="text-text-muted" />
            <span className="text-[14px] text-text-secondary">
                Drop PDF here or click to upload
            </span>
            <input
                type="file"
                accept={accept}
                multiple
                className="hidden"
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
        </label>
    );
}
