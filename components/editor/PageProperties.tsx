'use client';

import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Plus, Calendar as CalendarIcon, User, Type, Link as LinkIcon, CheckSquare,
    List, X, GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageField, PageFieldType } from '@/lib/types/block';

const FIELD_TYPE_LABELS: Record<PageFieldType, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    person: 'Person',
    select: 'Select',
    multi_select: 'Multi-select',
    url: 'URL',
    checkbox: 'Checkbox',
};

const FIELD_TYPE_ICONS: Record<PageFieldType, React.ReactNode> = {
    text: <Type size={14} />,
    number: <span className="text-[10px] font-mono">#</span>,
    date: <CalendarIcon size={14} />,
    person: <User size={14} />,
    select: <List size={14} />,
    multi_select: <List size={14} />,
    url: <LinkIcon size={14} />,
    checkbox: <CheckSquare size={14} />,
};

function formatFieldValue(field: PageField): string {
    const v = field.value;
    if (v === undefined || v === null || v === '') return 'Empty';
    if (field.type === 'checkbox') return (v as boolean) ? 'Yes' : 'No';
    if (field.type === 'date' && typeof v === 'string') {
        try {
            const d = new Date(v);
            return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
        } catch {
            return String(v);
        }
    }
    if (Array.isArray(v)) return (v as string[]).join(', ');
    return String(v);
}

function PropertyNameInput({
    field,
    onSave,
    onCancel,
}: {
    field: PageField;
    onSave: (name: string) => void;
    onCancel: () => void;
}) {
    const [localName, setLocalName] = useState(field.name);
    return (
        <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => onSave(localName.trim() || field.name)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(localName.trim() || field.name);
                if (e.key === 'Escape') {
                    setLocalName(field.name);
                    onCancel();
                }
            }}
            className="flex-1 min-w-0 px-1.5 py-0.5 text-[12px] rounded border border-border-default bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
            autoFocus
        />
    );
}

interface PagePropertiesProps {
    fields: PageField[];
    onChange: (fields: PageField[]) => void;
    className?: string;
}

export function PageProperties({ fields, onChange, className }: PagePropertiesProps) {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [addType, setAddType] = useState<PageFieldType | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!adding) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setAdding(false);
                setAddType(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [adding]);

    const addField = (type: PageFieldType) => {
        const name = FIELD_TYPE_LABELS[type];
        const newField: PageField = {
            id: uuidv4(),
            name,
            type,
            value: type === 'checkbox' ? false : type === 'number' ? 0 : undefined,
            options: type === 'select' || type === 'multi_select' ? [] : undefined,
        };
        onChange([...fields, newField]);
        setAdding(false);
        setAddType(null);
        setEditingId(newField.id);
    };

    const updateField = (id: string, updates: Partial<PageField>) => {
        onChange(
            fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const removeField = (id: string) => {
        onChange(fields.filter((f) => f.id !== id));
        setEditingId(null);
        setEditingNameId(null);
    };

    return (
        <div className={cn('flex flex-col', className)}>
            {fields.map((field) => (
                <div
                    key={field.id}
                    className="group flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-bg-hover/60 transition-colors duration-150"
                >
                    <div className="flex items-center justify-center w-5 h-5 text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <GripVertical size={12} />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[12px] text-text-muted w-[115px] shrink-0 min-w-[115px]">
                            {FIELD_TYPE_ICONS[field.type]}
                            {editingNameId === field.id ? (
                                <PropertyNameInput
                                    field={field}
                                    onSave={(name) => {
                                        updateField(field.id, { name });
                                        setEditingNameId(null);
                                    }}
                                    onCancel={() => setEditingNameId(null)}
                                />
                            ) : (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    className="truncate cursor-text hover:text-text-primary rounded px-1 -mx-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-blue/30 focus:ring-inset"
                                    onDoubleClick={() => setEditingNameId(field.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingNameId(field.id); } }}
                                    title="Double-click to edit name"
                                >
                                    {field.name}
                                </span>
                            )}
                        </span>
                        {editingId === field.id ? (
                            <FieldEditor
                                field={field}
                                onSave={(updates) => {
                                    updateField(field.id, updates);
                                    setEditingId(null);
                                }}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(field.id)}
                                        className="flex-1 min-w-0 text-left text-[13px] text-text-secondary hover:text-text-primary py-1 px-2 rounded-md border border-transparent hover:border-border-default hover:bg-bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-blue/30 transition-colors duration-150"
                                    >
                                {formatFieldValue(field)}
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-1.5 rounded-md text-text-muted hover:text-accent-red hover:bg-accent-red-soft opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        aria-label="Remove property"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}

            <div ref={menuRef} className="relative">
                {!adding ? (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className={cn(
                            'flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg text-[13px] text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors duration-150',
                            fields.length === 0 && 'border border-dashed border-border-default bg-bg-secondary/30 hover:bg-bg-hover hover:border-border-default w-full'
                        )}
                    >
                        <Plus size={14} />
                        Add property
                    </button>
                ) : (
                    <div className="absolute left-0 top-0 z-10 w-56 rounded-lg border border-border-default bg-bg-primary shadow-lg py-1"
                        style={{ animation: 'sporePopoverIn 0.15s ease-out forwards' }}
                    >
                        {!addType ? (
                            <>
                                <p className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                    Property type
                                </p>
                                {(Object.keys(FIELD_TYPE_LABELS) as PageFieldType[]).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setAddType(type)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-text-primary hover:bg-bg-hover text-left transition-colors duration-150"
                                    >
                                        {FIELD_TYPE_ICONS[type]}
                                        {FIELD_TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="px-3 py-2">
                                <p className="text-[11px] text-text-muted mb-2">
                                    Add {FIELD_TYPE_LABELS[addType]}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addField(addType)}
                                        className="px-2.5 py-1.5 text-[12px] font-medium rounded-md bg-accent-blue text-white hover:bg-accent-blue-hover transition-colors duration-150"
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddType(null)}
                                        className="px-2.5 py-1.5 text-[12px] rounded-md border border-border-default text-text-secondary hover:bg-bg-hover transition-colors duration-150"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface FieldEditorProps {
    field: PageField;
    onSave: (updates: Partial<PageField>) => void;
    onCancel: () => void;
}

function FieldEditor({ field, onSave, onCancel }: FieldEditorProps) {
    const [localValue, setLocalValue] = useState(field.value);
    const [localName, setLocalName] = useState(field.name);

    useEffect(() => {
        setLocalValue(field.value);
        setLocalName(field.name);
    }, [field.id, field.value, field.name]);

    const commit = (updates?: Partial<PageField>) => {
        onSave({ name: localName, value: localValue, ...updates });
    };

    switch (field.type) {
        case 'text':
            return (
                <input
                    type="text"
                    value={(localValue as string) ?? ''}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => commit()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') onCancel();
                    }}
                    placeholder="Text"
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                    autoFocus
                />
            );
        case 'number':
            return (
                <input
                    type="number"
                    value={(localValue as number) ?? ''}
                    onChange={(e) => setLocalValue(e.target.value === '' ? undefined : Number(e.target.value))}
                    onBlur={() => commit()}
                    onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                    placeholder="0"
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150 w-24"
                    autoFocus
                />
            );
        case 'date':
            return (
                <input
                    type="date"
                    value={typeof localValue === 'string' && localValue ? localValue.slice(0, 10) : ''}
                    onChange={(e) => setLocalValue(e.target.value || undefined)}
                    onBlur={() => commit()}
                    onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                    autoFocus
                />
            );
        case 'url':
            return (
                <input
                    type="url"
                    value={(localValue as string) ?? ''}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => commit()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') onCancel();
                    }}
                    placeholder="https://..."
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                    autoFocus
                />
            );
        case 'checkbox':
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={Boolean(localValue)}
                        onChange={(e) => {
                            setLocalValue(e.target.checked);
                            onSave({ value: e.target.checked });
                        }}
                        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                        className="rounded border-border-default text-accent-blue focus:ring-accent-blue/30 transition-colors duration-150"
                    />
                    <span className="text-[13px] text-text-secondary">{(localValue as boolean) ? 'Yes' : 'No'}</span>
                </label>
            );
        case 'person':
            return (
                <input
                    type="text"
                    value={(localValue as string) ?? ''}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => commit()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') onCancel();
                    }}
                    placeholder="Name or email"
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                    autoFocus
                />
            );
        case 'select':
            return (
                <SelectEditor
                    field={field}
                    localValue={localValue as string | undefined}
                    setLocalValue={(v: unknown) => setLocalValue(v as string | number | boolean | string[] | null | undefined)}
                    onSave={onSave}
                    onCancel={onCancel}
                    multi={false}
                />
            );
        case 'multi_select':
            return (
                <SelectEditor
                    field={field}
                    localValue={localValue as string[] | undefined}
                    setLocalValue={(v: unknown) => setLocalValue(v as string | number | boolean | string[] | null | undefined)}
                    onSave={onSave}
                    onCancel={onCancel}
                    multi={true}
                />
            );
        default:
            return (
                <input
                    type="text"
                    value={String(localValue ?? '')}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => commit()}
                    onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                    className="flex-1 min-w-0 px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-shadow duration-150"
                    autoFocus
                />
            );
    }
}

function SelectEditor({
    field,
    localValue,
    setLocalValue,
    onSave,
    onCancel,
    multi,
}: {
    field: PageField;
    localValue: string | string[] | undefined;
    setLocalValue: (v: unknown) => void;
    onSave: (u: Partial<PageField>) => void;
    onCancel: () => void;
    multi: boolean;
}) {
    const options = field.options ?? [];
    const [newOpt, setNewOpt] = useState('');
    const selectedList = multi && Array.isArray(localValue) ? localValue : [];

    const removeMulti = (item: string) => {
        const next = selectedList.filter((s) => s !== item);
        setLocalValue(next);
        onSave({ value: next });
    };

    return (
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
            {multi && selectedList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                    {selectedList.map((o) => (
                        <span
                            key={o}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] rounded-md bg-bg-secondary border border-border-default text-text-primary"
                        >
                            {o}
                            <button
                                type="button"
                                onClick={() => removeMulti(o)}
                                className="p-0.5 rounded text-text-muted hover:text-accent-red hover:bg-accent-red-soft transition-colors"
                                aria-label={`Remove ${o}`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {options.length > 0 && (
                <select
                    value={multi ? '' : (localValue as string)}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (multi) {
                            if (!v) return;
                            const next = [...selectedList, v];
                            setLocalValue(next);
                            onSave({ value: next });
                        } else {
                            setLocalValue(v);
                            onSave({ value: v });
                        }
                    }}
                    onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                    className="text-[13px] px-2 py-1 rounded-md border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-shadow duration-150"
                >
                    <option value="">{multi ? 'Add...' : 'Choose...'}</option>
                    {options.map((o) => (
                        <option key={o} value={o} disabled={multi && selectedList.includes(o)}>{o}</option>
                    ))}
                </select>
            )}
            <input
                type="text"
                value={newOpt}
                onChange={(e) => setNewOpt(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newOpt.trim()) {
                            const trimmed = newOpt.trim();
                            const nextOptions = options.includes(trimmed) ? options : [...options, trimmed];
                            if (multi) {
                                const nextVal = selectedList.includes(trimmed) ? selectedList : [...selectedList, trimmed];
                                setLocalValue(nextVal);
                                onSave({ options: nextOptions, value: nextVal });
                            } else {
                                setLocalValue(trimmed);
                                onSave({ options: nextOptions, value: trimmed });
                            }
                            setNewOpt('');
                        }
                    }
                    if (e.key === 'Escape') onCancel();
                }}
                placeholder="Add option..."
                className="flex-1 min-w-[80px] px-2 py-1 text-[13px] rounded-md border border-border-default bg-bg-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-shadow duration-150"
            />
        </div>
    );
}