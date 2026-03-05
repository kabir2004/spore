'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60;   // px per hour in time grid
const HOURS = 24;
const TIME_GUTTER_W = 56; // px — left column for hour labels
const DAY_HEADER_H = 52;  // px — sticky day name + date row height

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// SSR-safe: fixed date matching mock data era so server & client match
const INIT_DATE = new Date(2026, 2, 2); // March 2 2026

// ─── Types ────────────────────────────────────────────────────────────────────

type CalView = 'month' | 'week' | 'day';
type EventColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink';

interface CalEvent {
    id: string;
    title: string;
    color: EventColor;
    allDay: boolean;
    start: Date; // for allDay: start of day; for timed: exact datetime
    end: Date;   // for allDay: end of day; for timed: exact datetime
}

interface EventDraft {
    id: string | null; // null = new event
    title: string;
    color: EventColor;
    allDay: boolean;
    startDate: string; // "YYYY-MM-DD"
    endDate: string;   // "YYYY-MM-DD"
    startTime: string; // "HH:MM" — ignored when allDay
    endTime: string;   // "HH:MM" — ignored when allDay
}

// ─── Color config ─────────────────────────────────────────────────────────────

const COLORS: Record<EventColor, { soft: string; main: string; label: string }> = {
    blue:   { soft: 'var(--accent-blue-soft)',   main: 'var(--accent-blue)',   label: 'Blue' },
    green:  { soft: 'var(--accent-green-soft)',  main: 'var(--accent-green)',  label: 'Green' },
    red:    { soft: 'var(--accent-red-soft)',    main: 'var(--accent-red)',    label: 'Red' },
    orange: { soft: 'var(--accent-orange-soft)', main: 'var(--accent-orange)', label: 'Orange' },
    purple: { soft: 'var(--accent-purple-soft)', main: 'var(--accent-purple)', label: 'Purple' },
    pink:   { soft: 'var(--accent-pink-soft)',   main: 'var(--accent-pink)',   label: 'Pink' },
};
const COLOR_OPTIONS: EventColor[] = ['blue', 'green', 'red', 'orange', 'purple', 'pink'];

// ─── Date utilities ───────────────────────────────────────────────────────────

function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Week starts Sunday
function startOfWeek(d: Date): Date {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() - r.getDay());
    return r;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMonthGridDays(year: number, month: number): Date[] {
    const first = new Date(year, month, 1);
    const grid = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(grid, i));
}

function formatHour(h: number): string {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
}

function formatTime12(d: Date): string {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? 'AM' : 'PM';
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parseHHMM(hhmm: string): { h: number; m: number } {
    const [h, m] = hhmm.split(':').map(Number);
    return { h: h || 0, m: m || 0 };
}

function formatWeekTitle(weekStart: Date): string {
    const weekEnd = addDays(weekStart, 6);
    const sy = weekStart.getFullYear();
    const ey = weekEnd.getFullYear();
    const sm = MONTH_NAMES[weekStart.getMonth()];
    const em = MONTH_NAMES[weekEnd.getMonth()];
    const sd = weekStart.getDate();
    const ed = weekEnd.getDate();
    if (sy !== ey) return `${MONTH_SHORT[weekStart.getMonth()]} ${sd}, ${sy} – ${MONTH_SHORT[weekEnd.getMonth()]} ${ed}, ${ey}`;
    if (weekStart.getMonth() !== weekEnd.getMonth()) return `${MONTH_SHORT[weekStart.getMonth()]} ${sd} – ${MONTH_SHORT[weekEnd.getMonth()]} ${ed}, ${ey}`;
    return `${sm} ${sd}–${ed}, ${ey}`;
}

function newId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Event positioning (overlapping timed events) ─────────────────────────────

interface PositionedEvent {
    event: CalEvent;
    col: number;
    numCols: number;
    top: number;    // px
    height: number; // px
}

function layoutTimedEvents(events: CalEvent[]): PositionedEvent[] {
    const timed = events.filter(e => !e.allDay).sort((a, b) => {
        const d = a.start.getTime() - b.start.getTime();
        return d !== 0 ? d : a.end.getTime() - b.end.getTime();
    });
    if (!timed.length) return [];

    const result: PositionedEvent[] = [];
    let i = 0;

    while (i < timed.length) {
        let maxEnd = timed[i].end.getTime();
        let j = i + 1;
        while (j < timed.length && timed[j].start.getTime() < maxEnd) {
            maxEnd = Math.max(maxEnd, timed[j].end.getTime());
            j++;
        }
        const cluster = timed.slice(i, j);
        const colEnds: number[] = [];
        const colAssigned: number[] = [];

        for (const ev of cluster) {
            let col = colEnds.findIndex(end => end <= ev.start.getTime());
            if (col === -1) { col = colEnds.length; colEnds.push(0); }
            colEnds[col] = ev.end.getTime();
            colAssigned.push(col);
        }
        const numCols = colEnds.length;
        cluster.forEach((ev, k) => {
            const startMin = ev.start.getHours() * 60 + ev.start.getMinutes();
            const endMin = ev.end.getHours() * 60 + ev.end.getMinutes();
            const durationMin = Math.max(30, endMin - startMin);
            result.push({
                event: ev,
                col: colAssigned[k],
                numCols,
                top: (startMin / 60) * HOUR_HEIGHT,
                height: Math.max(22, (durationMin / 60) * HOUR_HEIGHT - 2),
            });
        });
        i = j;
    }
    return result;
}

// ─── All-day row layout (spanning events in week view) ────────────────────────

interface PositionedAllDay {
    event: CalEvent;
    startCol: number; // 0-6
    endCol: number;   // 0-6
    row: number;
}

function layoutAllDayEvents(events: CalEvent[], weekStart: Date): PositionedAllDay[] {
    const weekEnd = addDays(weekStart, 6);
    const relevant = events
        .filter(e => {
            const startsBeforeWeekEnd = e.start <= addDays(weekEnd, 1);
            const endsAfterWeekStart = e.end >= weekStart;
            return (e.allDay || !isSameDay(e.start, e.end)) && startsBeforeWeekEnd && endsAfterWeekStart;
        })
        .sort((a, b) => {
            const d = a.start.getTime() - b.start.getTime();
            return d !== 0 ? d : b.end.getTime() - a.end.getTime();
        });

    const placed: PositionedAllDay[] = [];
    const rowEndCols: number[] = [];

    for (const event of relevant) {
        const rawStart = Math.floor((event.start.getTime() - weekStart.getTime()) / 86_400_000);
        const rawEnd = Math.floor((event.end.getTime() - weekStart.getTime()) / 86_400_000);
        const startCol = Math.max(0, rawStart);
        const endCol = Math.min(6, rawEnd);

        let row = rowEndCols.findIndex(ec => ec < startCol);
        if (row === -1) { row = rowEndCols.length; rowEndCols.push(-1); }
        rowEndCols[row] = endCol;
        placed.push({ event, startCol, endCol, row });
    }
    return placed;
}

// ─── Mock initial events ──────────────────────────────────────────────────────

const INITIAL_EVENTS: CalEvent[] = [
    { id: 'e1',  title: 'Morning Standup',        color: 'green',  allDay: false, start: new Date(2026, 2, 2, 9, 0),  end: new Date(2026, 2, 2, 9, 30) },
    { id: 'e2',  title: 'Product Vision Sync',     color: 'blue',   allDay: false, start: new Date(2026, 2, 2, 11, 0), end: new Date(2026, 2, 2, 12, 0) },
    { id: 'e3',  title: 'Design Review',           color: 'purple', allDay: false, start: new Date(2026, 2, 2, 14, 0), end: new Date(2026, 2, 2, 15, 0) },
    { id: 'e4',  title: 'Design Sync',             color: 'pink',   allDay: false, start: new Date(2026, 2, 3, 10, 0), end: new Date(2026, 2, 3, 11, 30) },
    { id: 'e5',  title: '1:1 with Alex',           color: 'purple', allDay: false, start: new Date(2026, 2, 3, 15, 0), end: new Date(2026, 2, 3, 15, 30) },
    { id: 'e6',  title: 'Lunch',                   color: 'orange', allDay: false, start: new Date(2026, 2, 3, 12, 0), end: new Date(2026, 2, 3, 13, 0) },
    { id: 'e7',  title: 'Engineering All-Hands',   color: 'blue',   allDay: false, start: new Date(2026, 2, 4, 16, 0), end: new Date(2026, 2, 4, 17, 0) },
    { id: 'e8',  title: 'Investor Call',           color: 'red',    allDay: false, start: new Date(2026, 2, 5, 11, 0), end: new Date(2026, 2, 5, 12, 0) },
    { id: 'e9',  title: 'Sprint Planning',         color: 'green',  allDay: false, start: new Date(2026, 2, 6, 9, 0),  end: new Date(2026, 2, 6, 10, 30) },
    { id: 'e10', title: 'Q1 Quarterly Review',     color: 'blue',   allDay: true,  start: new Date(2026, 2, 9),        end: new Date(2026, 2, 9) },
    { id: 'e11', title: 'Team Offsite',            color: 'green',  allDay: true,  start: new Date(2026, 2, 16),       end: new Date(2026, 2, 17) },
    { id: 'e12', title: 'Board Meeting',           color: 'red',    allDay: false, start: new Date(2026, 2, 12, 10, 0), end: new Date(2026, 2, 12, 12, 0) },
    { id: 'e13', title: 'Product Demo',            color: 'purple', allDay: false, start: new Date(2026, 2, 12, 14, 0), end: new Date(2026, 2, 12, 15, 30) },
    { id: 'e14', title: 'Weekly Retro',            color: 'orange', allDay: false, start: new Date(2026, 2, 13, 16, 30), end: new Date(2026, 2, 13, 17, 30) },
    { id: 'e15', title: 'Onboarding — New Hire',   color: 'pink',   allDay: true,  start: new Date(2026, 2, 2),        end: new Date(2026, 2, 2) },
];

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({ draft, onClose, onSave, onDelete }: {
    draft: EventDraft;
    onClose: () => void;
    onSave: (d: EventDraft) => void;
    onDelete: () => void;
}) {
    const [form, setForm] = useState<EventDraft>(draft);
    const update = <K extends keyof EventDraft>(key: K, val: EventDraft[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const handleAllDay = (checked: boolean) => {
        setForm(prev => ({ ...prev, allDay: checked }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
            <div className="w-[440px] bg-bg-primary rounded-[12px] border border-border-default shadow-xl overflow-hidden">
                {/* Title */}
                <div className="px-5 pt-5 pb-4 border-b border-border-light">
                    <input
                        autoFocus
                        type="text"
                        value={form.title}
                        onChange={e => update('title', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && form.title.trim() && onSave(form)}
                        placeholder="Event title"
                        className="w-full text-[20px] font-semibold bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                    />
                </div>

                <div className="px-5 py-4 flex flex-col gap-4">
                    {/* All-day toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] text-text-secondary">All day</span>
                        <button
                            onClick={() => handleAllDay(!form.allDay)}
                            className={cn(
                                'relative w-8 h-[18px] rounded-full transition-colors',
                                form.allDay ? 'bg-accent-blue' : 'bg-bg-active border border-border-default'
                            )}
                        >
                            <span className={cn(
                                'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform',
                                form.allDay ? 'left-[18px]' : 'left-[2px]'
                            )} />
                        </button>
                    </div>

                    {/* Date fields */}
                    <div className={cn('grid gap-3', form.allDay ? 'grid-cols-2' : 'grid-cols-1')}>
                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                {form.allDay ? 'Start' : 'Date'}
                            </label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => update('startDate', e.target.value)}
                                className="px-3 py-2 text-[13px] bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                            />
                        </div>
                        {form.allDay && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">End</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    min={form.startDate}
                                    onChange={e => update('endDate', e.target.value)}
                                    className="px-3 py-2 text-[13px] bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Time fields */}
                    {!form.allDay && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Start time</label>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={e => update('startTime', e.target.value)}
                                    className="px-3 py-2 text-[13px] bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">End time</label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={e => update('endTime', e.target.value)}
                                    className="px-3 py-2 text-[13px] bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Color */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Color</label>
                        <div className="flex items-center gap-2.5">
                            {COLOR_OPTIONS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => update('color', c)}
                                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
                                    style={{ backgroundColor: COLORS[c].main }}
                                    title={COLORS[c].label}
                                >
                                    {form.color === c && <Check size={12} className="text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-light">
                    <div>
                        {draft.id !== null && (
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-1.5 text-[13px] text-accent-red hover:opacity-70 transition-opacity"
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover rounded-[6px] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(form)}
                            disabled={!form.title.trim()}
                            className="px-3.5 py-1.5 text-[13px] font-medium bg-accent-blue text-white rounded-[6px] hover:bg-accent-blue-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {draft.id === null ? 'Create' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── EventChip (shared between month + all-day row) ───────────────────────────

function EventChip({ event, onClick, startsBefore = false, endsAfter = false }: {
    event: CalEvent;
    onClick: (e: React.MouseEvent) => void;
    startsBefore?: boolean;
    endsAfter?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center px-1.5 h-[22px] text-[11.5px] font-medium truncate hover:brightness-95 transition-all',
                startsBefore ? 'rounded-l-none' : 'rounded-l-[3px]',
                endsAfter ? 'rounded-r-none' : 'rounded-r-[3px]',
            )}
            style={{
                backgroundColor: COLORS[event.color].soft,
                borderLeft: startsBefore ? 'none' : `2.5px solid ${COLORS[event.color].main}`,
                color: COLORS[event.color].main,
            }}
        >
            <span className="truncate">{event.title}</span>
        </button>
    );
}

// ─── TimedEventBlock ──────────────────────────────────────────────────────────

function TimedEventBlock({ pe, onClick }: { pe: PositionedEvent; onClick: (e: React.MouseEvent) => void }) {
    const c = COLORS[pe.event.color];
    const showTime = pe.height >= 38;
    return (
        <button
            onClick={onClick}
            className="absolute flex flex-col overflow-hidden text-left px-1.5 pt-1 rounded-[4px] hover:brightness-95 transition-all"
            style={{
                top: pe.top,
                height: pe.height,
                left: `calc(${(pe.col / pe.numCols) * 100}% + 2px)`,
                width: `calc(${(1 / pe.numCols) * 100}% - 4px)`,
                backgroundColor: c.soft,
                borderLeft: `3px solid ${c.main}`,
            }}
        >
            <span className="text-[12px] font-semibold leading-tight truncate" style={{ color: c.main }}>
                {pe.event.title}
            </span>
            {showTime && (
                <span className="text-[11px] leading-tight truncate opacity-80 mt-0.5" style={{ color: c.main }}>
                    {formatTime12(pe.event.start)} – {formatTime12(pe.event.end)}
                </span>
            )}
        </button>
    );
}

// ─── TimeGutter ───────────────────────────────────────────────────────────────

function TimeGutter() {
    return (
        <div className="shrink-0 relative select-none" style={{ width: TIME_GUTTER_W, height: HOURS * HOUR_HEIGHT }}>
            {Array.from({ length: HOURS }, (_, h) => (
                <div key={h} className="absolute w-full" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                    {h > 0 && (
                        <span className="absolute right-2 -top-[9px] text-[11px] text-text-muted leading-none">
                            {formatHour(h)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

function DayColumn({ date, positioned, isToday, nowTop, onSlotClick, onEventClick }: {
    date: Date;
    positioned: PositionedEvent[];
    isToday: boolean;
    nowTop: number | null; // px from top of grid, null if not today
    onSlotClick: (h: number, m: number) => void;
    onEventClick: (ev: CalEvent) => void;
}) {
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const totalMinutes = Math.floor(y / HOUR_HEIGHT * 60 / 15) * 15;
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        onSlotClick(h, m);
    }, [onSlotClick]);

    return (
        <div
            className={cn(
                'relative flex-1 border-r border-border-light last:border-r-0 cursor-pointer',
                isToday && 'bg-accent-blue/[0.018]'
            )}
            style={{ height: HOURS * HOUR_HEIGHT }}
            onClick={handleClick}
        >
            {/* Hour grid lines */}
            {Array.from({ length: HOURS }, (_, h) => (
                <React.Fragment key={h}>
                    <div className="absolute left-0 right-0 border-t border-border-light" style={{ top: h * HOUR_HEIGHT }} />
                    {h > 0 && (
                        <div className="absolute left-0 right-0 border-t border-border-light opacity-40"
                            style={{ top: h * HOUR_HEIGHT - HOUR_HEIGHT / 2 }} />
                    )}
                </React.Fragment>
            ))}

            {/* Current time indicator (only for today) */}
            {nowTop !== null && (
                <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top: nowTop }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-red shrink-0 -translate-y-1/2 -translate-x-[5px]" />
                    <div className="flex-1 h-[1.5px] bg-accent-red" />
                </div>
            )}

            {/* Events */}
            {positioned.map(pe => (
                <TimedEventBlock
                    key={pe.event.id}
                    pe={pe}
                    onClick={e => { e.stopPropagation(); onEventClick(pe.event); }}
                />
            ))}
        </div>
    );
}

// ─── AllDayStrip ──────────────────────────────────────────────────────────────

function AllDayStrip({ days, allDayLayout, onEventClick, onSlotClick }: {
    days: Date[];
    allDayLayout: PositionedAllDay[];
    onEventClick: (ev: CalEvent) => void;
    onSlotClick: (date: Date) => void;
}) {
    const numRows = allDayLayout.length > 0 ? Math.max(...allDayLayout.map(p => p.row)) + 1 : 0;
    const stripH = Math.max(32, numRows * 24 + 8);
    const colW = 100 / days.length;

    return (
        <div className="flex shrink-0 border-b border-border-default" style={{ minHeight: stripH }}>
            {/* Label */}
            <div
                className="shrink-0 flex items-start justify-end pr-2 pt-2"
                style={{ width: TIME_GUTTER_W }}
            >
                <span className="text-[10px] text-text-muted select-none">All day</span>
            </div>

            {/* Events area */}
            <div className="flex-1 relative">
                {/* Column separators */}
                {days.map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-border-light last:border-r-0"
                        style={{ left: `${(i + 1) * colW}%` }}
                    />
                ))}

                {/* Clickable slots */}
                {days.map((day, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 cursor-pointer hover:bg-bg-hover/50 transition-colors"
                        style={{ left: `${i * colW}%`, width: `${colW}%` }}
                        onClick={() => onSlotClick(day)}
                    />
                ))}

                {/* All-day event chips */}
                {allDayLayout.map(({ event, startCol, endCol, row }) => {
                    const left = `${startCol * colW}%`;
                    const width = `calc(${(endCol - startCol + 1) * colW}% - 4px)`;
                    const top = row * 24 + 4;
                    const startsBefore = startCol === 0 && event.start < days[0];
                    const endsAfter = endCol === days.length - 1 && event.end > days[days.length - 1];
                    return (
                        <div
                            key={event.id}
                            className="absolute"
                            style={{ left, width, top, zIndex: 2 }}
                        >
                            <EventChip
                                event={event}
                                onClick={e => { e.stopPropagation(); onEventClick(event); }}
                                startsBefore={startsBefore}
                                endsAfter={endsAfter}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── WeekView ────────────────────────────────────────────────────────────────

function WeekView({ days, events, now, onEventClick, onSlotClick, onAllDaySlotClick }: {
    days: Date[];
    events: CalEvent[];
    now: Date;
    onEventClick: (ev: CalEvent) => void;
    onSlotClick: (date: Date, h: number, m: number) => void;
    onAllDaySlotClick: (date: Date) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days[0].toISOString()]); // scroll when week changes

    const allDayLayout = useMemo(() => layoutAllDayEvents(events, days[0]), [events, days]);

    const timedByDay = useMemo(() => {
        const map: Record<string, PositionedEvent[]> = {};
        for (const day of days) {
            const dayStr = dateKey(day);
            const dayEvents = events.filter(e => !e.allDay && isSameDay(e.start, day));
            map[dayStr] = layoutTimedEvents(dayEvents);
        }
        return map;
    }, [events, days]);

    const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day header row */}
            <div className="flex shrink-0 border-b border-border-default" style={{ height: DAY_HEADER_H }}>
                <div style={{ width: TIME_GUTTER_W }} className="shrink-0" />
                {days.map((day, i) => {
                    const today = isSameDay(day, now);
                    return (
                        <div
                            key={i}
                            className={cn(
                                'flex-1 flex flex-col items-center justify-center border-r border-border-light last:border-r-0 select-none',
                                today && 'bg-accent-blue/[0.03]'
                            )}
                        >
                            <span className={cn(
                                'text-[11px] font-semibold uppercase tracking-wider',
                                today ? 'text-accent-blue' : 'text-text-muted'
                            )}>
                                {DAY_NAMES[day.getDay()]}
                            </span>
                            <span className={cn(
                                'text-[17px] font-semibold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full leading-none',
                                today ? 'bg-accent-blue text-white' : 'text-text-primary'
                            )}>
                                {day.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* All-day strip */}
            <AllDayStrip
                days={days}
                allDayLayout={allDayLayout}
                onEventClick={onEventClick}
                onSlotClick={onAllDaySlotClick}
            />

            {/* Scrollable time grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto flex">
                <TimeGutter />
                <div className="flex flex-1">
                    {days.map((day, i) => {
                        const dayStr = dateKey(day);
                        const today = isSameDay(day, now);
                        return (
                            <DayColumn
                                key={i}
                                date={day}
                                positioned={timedByDay[dayStr] ?? []}
                                isToday={today}
                                nowTop={today ? nowTop : null}
                                onSlotClick={(h, m) => onSlotClick(day, h, m)}
                                onEventClick={onEventClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── DayView ─────────────────────────────────────────────────────────────────

function DayView({ date, events, now, onEventClick, onSlotClick, onAllDaySlotClick }: {
    date: Date;
    events: CalEvent[];
    now: Date;
    onEventClick: (ev: CalEvent) => void;
    onSlotClick: (date: Date, h: number, m: number) => void;
    onAllDaySlotClick: (date: Date) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isToday = isSameDay(date, now);
    const dateStr = dateKey(date);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1) * HOUR_HEIGHT);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateStr]);

    const allDayLayout = useMemo(() => layoutAllDayEvents(events, date), [events, date]);
    const positioned = useMemo(() => {
        return layoutTimedEvents(events.filter(e => !e.allDay && isSameDay(e.start, date)));
    }, [events, date]);

    const nowTop = isToday ? (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT : null;

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day header */}
            <div className="flex shrink-0 border-b border-border-default" style={{ height: DAY_HEADER_H }}>
                <div style={{ width: TIME_GUTTER_W }} className="shrink-0" />
                <div className={cn(
                    'flex-1 flex flex-col items-center justify-center select-none',
                    isToday && 'bg-accent-blue/[0.03]'
                )}>
                    <span className={cn(
                        'text-[11px] font-semibold uppercase tracking-wider',
                        isToday ? 'text-accent-blue' : 'text-text-muted'
                    )}>
                        {DAY_NAMES[date.getDay()]}
                    </span>
                    <span className={cn(
                        'text-[22px] font-semibold mt-0.5 w-10 h-10 flex items-center justify-center rounded-full leading-none',
                        isToday ? 'bg-accent-blue text-white' : 'text-text-primary'
                    )}>
                        {date.getDate()}
                    </span>
                </div>
            </div>

            {/* All-day strip */}
            <AllDayStrip
                days={[date]}
                allDayLayout={allDayLayout}
                onEventClick={onEventClick}
                onSlotClick={onAllDaySlotClick}
            />

            {/* Scrollable time grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto flex">
                <TimeGutter />
                <div className="flex-1">
                    <DayColumn
                        date={date}
                        positioned={positioned}
                        isToday={isToday}
                        nowTop={nowTop}
                        onSlotClick={(h, m) => onSlotClick(date, h, m)}
                        onEventClick={onEventClick}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({ year, month, gridDays, events, now, onDayClick, onEventClick, onSlotClick }: {
    year: number;
    month: number;
    gridDays: Date[];
    events: CalEvent[];
    now: Date;
    onDayClick: (date: Date) => void;
    onEventClick: (ev: CalEvent) => void;
    onSlotClick: (date: Date) => void;
}) {
    // Build event map: dateKey → events (sorted)
    const eventMap = useMemo(() => {
        const map: Record<string, CalEvent[]> = {};
        for (const ev of events) {
            let d = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
            const endDay = new Date(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate());
            while (d <= endDay) {
                const key = dateKey(d);
                if (!map[key]) map[key] = [];
                map[key].push(ev);
                d = addDays(d, 1);
            }
        }
        return map;
    }, [events]);

    const MAX_VISIBLE = 3;

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 shrink-0 border-b border-border-default">
                {DAY_NAMES.map(d => (
                    <div key={d} className="py-2 text-center text-[11.5px] font-semibold text-text-muted uppercase tracking-wider select-none border-r border-border-light last:border-r-0">
                        {d}
                    </div>
                ))}
            </div>

            {/* 6×7 day grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
                {gridDays.map((day, idx) => {
                    const key = dateKey(day);
                    const dayEvents = eventMap[key] ?? [];
                    const visible = dayEvents.slice(0, MAX_VISIBLE);
                    const overflow = dayEvents.length - MAX_VISIBLE;
                    const inMonth = day.getMonth() === month;
                    const today = isSameDay(day, now);

                    return (
                        <div
                            key={key}
                            className={cn(
                                'flex flex-col border-r border-b border-border-light overflow-hidden cursor-pointer group',
                                !inMonth && 'bg-bg-secondary/40',
                                idx % 7 === 6 && 'border-r-0',
                            )}
                            onClick={() => onSlotClick(day)}
                        >
                            {/* Date number */}
                            <div className="flex items-center justify-end px-2 pt-1.5 pb-0.5 shrink-0">
                                <button
                                    onClick={e => { e.stopPropagation(); onDayClick(day); }}
                                    className={cn(
                                        'w-[26px] h-[26px] flex items-center justify-center rounded-full text-[13px] font-medium leading-none transition-colors',
                                        today
                                            ? 'bg-accent-blue text-white font-semibold'
                                            : inMonth
                                                ? 'text-text-primary hover:bg-bg-hover'
                                                : 'text-text-placeholder hover:bg-bg-hover'
                                    )}
                                >
                                    {day.getDate()}
                                </button>
                            </div>

                            {/* Events */}
                            <div className="flex flex-col gap-0.5 px-1 pb-1 min-h-0 overflow-hidden">
                                {visible.map(ev => {
                                    const evStart = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
                                    const evEnd = new Date(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate());
                                    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                                    const startsBefore = evStart < dayDate;
                                    const endsAfter = evEnd > dayDate;
                                    return (
                                        <EventChip
                                            key={ev.id + key}
                                            event={ev}
                                            onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                                            startsBefore={startsBefore}
                                            endsAfter={endsAfter}
                                        />
                                    );
                                })}
                                {overflow > 0 && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onDayClick(day); }}
                                        className="text-[11px] text-text-muted hover:text-text-secondary px-1.5 text-left transition-colors"
                                    >
                                        +{overflow} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── CalendarPage (main export) ───────────────────────────────────────────────

import type { CalendarEvent as DBCalendarEvent } from '@/lib/types/calendarEvent';

function dbEventToCalEvent(e: DBCalendarEvent): CalEvent {
    const colorMap: Record<string, EventColor> = {
        '#2383E2': 'blue', '#0F7B6C': 'green', '#E03E3E': 'red',
        '#D9730D': 'orange', '#6940A5': 'purple', '#AD1A72': 'pink',
        google: 'blue', microsoft: 'purple', spore: 'blue', cal_com: 'green',
    };
    const color: EventColor = (e.color && colorMap[e.color])
        || colorMap[e.source]
        || 'blue';
    return {
        id:     e.id,
        title:  e.title,
        color,
        allDay: e.all_day,
        start:  new Date(e.start_time),
        end:    new Date(e.end_time),
    };
}

interface CalendarPageProps {
    initialEvents?:        DBCalendarEvent[];
    workspaceId?:          string;
    workspaceSlug?:        string;
    hasGoogleCalendar?:    boolean;
    hasMicrosoftCalendar?: boolean;
}

export function CalendarPage({
    initialEvents,
    workspaceId,
    workspaceSlug,
    hasGoogleCalendar    = false,
    hasMicrosoftCalendar = false,
}: CalendarPageProps = {}) {
    const [now, setNow] = useState<Date>(INIT_DATE);
    const [anchor, setAnchor] = useState<Date>(INIT_DATE);
    const [view, setView] = useState<CalView>('week');

    // Seed from DB events if available, else fall back to demo data
    const seedEvents = initialEvents?.length
        ? initialEvents.map(dbEventToCalEvent)
        : INITIAL_EVENTS;

    const [events, setEvents] = useState<CalEvent[]>(seedEvents);
    const [draft, setDraft] = useState<EventDraft | null>(null);

    // Update to real date/time on client mount; tick every minute
    useEffect(() => {
        const realNow = new Date();
        setNow(realNow);
        setAnchor(realNow);
        const tick = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(tick);
    }, []);

    // Derived anchors
    const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const monthGridDays = useMemo(() => getMonthGridDays(anchor.getFullYear(), anchor.getMonth()), [anchor]);

    // Header title
    const title = useMemo(() => {
        if (view === 'day') {
            return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
        if (view === 'week') return formatWeekTitle(weekStart);
        return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }, [view, anchor, weekStart]);

    // Navigation
    const navigate = useCallback((dir: 1 | -1) => {
        setAnchor(prev => {
            if (view === 'day') return addDays(prev, dir);
            if (view === 'week') return addDays(prev, dir * 7);
            return addMonths(prev, dir);
        });
    }, [view]);

    // Draft helpers
    const openCreate = useCallback((date: Date, h = 9, m = 0, allDay = false) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const startH = h;
        const endH = Math.min(23, h + 1);
        setDraft({
            id: null,
            title: '',
            color: 'blue',
            allDay,
            startDate: dateKey(date),
            endDate: dateKey(date),
            startTime: `${pad(startH)}:${pad(m)}`,
            endTime: `${pad(endH)}:${pad(m)}`,
        });
    }, []);

    const openEdit = useCallback((ev: CalEvent) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        setDraft({
            id: ev.id,
            title: ev.title,
            color: ev.color,
            allDay: ev.allDay,
            startDate: dateKey(ev.start),
            endDate: dateKey(ev.end),
            startTime: `${pad(ev.start.getHours())}:${pad(ev.start.getMinutes())}`,
            endTime: `${pad(ev.end.getHours())}:${pad(ev.end.getMinutes())}`,
        });
    }, []);

    const handleSave = useCallback((d: EventDraft) => {
        if (!d.title.trim()) return;
        const start = parseKey(d.startDate);
        const end = parseKey(d.endDate || d.startDate);
        if (!d.allDay) {
            const { h: sh, m: sm } = parseHHMM(d.startTime || '09:00');
            const { h: eh, m: em } = parseHHMM(d.endTime || '10:00');
            start.setHours(sh, sm, 0, 0);
            end.setHours(eh, em, 0, 0);
            // If end is before start (same day), set end to 1hr after start
            if (isSameDay(start, end) && end <= start) end.setHours(sh + 1, sm, 0, 0);
        }
        const saved: CalEvent = { id: d.id ?? newId(), title: d.title.trim(), color: d.color, allDay: d.allDay, start, end };
        setEvents(prev => d.id ? prev.map(e => e.id === d.id ? saved : e) : [...prev, saved]);
        setDraft(null);
    }, []);

    const handleDelete = useCallback(() => {
        if (draft?.id) setEvents(prev => prev.filter(e => e.id !== draft.id));
        setDraft(null);
    }, [draft]);

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-bg-primary">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 rounded-[6px] text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <button
                            onClick={() => { setAnchor(now); }}
                            className="px-3 py-1 text-[13px] font-medium text-text-secondary border border-border-default rounded-[6px] hover:bg-bg-hover transition-colors mx-1"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => navigate(1)}
                            className="p-1.5 rounded-[6px] text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                    <h1
                        className="text-[16px] font-semibold text-text-primary select-none"
                        suppressHydrationWarning
                    >
                        {title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* View switcher */}
                    <div className="flex bg-bg-secondary border border-border-default rounded-[7px] p-0.5">
                        {(['day', 'week', 'month'] as CalView[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    'px-3 py-1 text-[13px] font-medium rounded-[5px] capitalize transition-colors',
                                    view === v
                                        ? 'bg-bg-primary text-text-primary shadow-sm'
                                        : 'text-text-muted hover:text-text-secondary'
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Integration pills */}
                    {(hasGoogleCalendar || hasMicrosoftCalendar) && (
                        <div className="flex items-center gap-1.5">
                            {hasGoogleCalendar && (
                                <span className="flex items-center gap-1 text-[11.5px] font-medium text-[#4285F4] bg-[#4285F4]/10 border border-[#4285F4]/20 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                                    Google
                                </span>
                            )}
                            {hasMicrosoftCalendar && (
                                <span className="flex items-center gap-1 text-[11.5px] font-medium text-[#0078D4] bg-[#0078D4]/10 border border-[#0078D4]/20 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0078D4]" />
                                    Outlook
                                </span>
                            )}
                        </div>
                    )}

                    {/* New event */}
                    <button
                        onClick={() => openCreate(anchor)}
                        className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-[7px] bg-accent-blue text-white text-[13px] font-medium hover:bg-accent-blue-hover transition-colors"
                    >
                        <Plus size={14} />
                        New event
                    </button>

                    {/* Connect calendar CTA when no integrations */}
                    {!hasGoogleCalendar && !hasMicrosoftCalendar && workspaceSlug && (
                        <a
                            href={`/${workspaceSlug}/settings/integrations`}
                            className="flex items-center gap-1.5 px-3 py-[7px] rounded-[7px] border border-border-default text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                        >
                            Connect calendar
                        </a>
                    )}
                </div>
            </div>

            {/* ── Calendar body ── */}
            {view === 'week' && (
                <WeekView
                    days={weekDays}
                    events={events}
                    now={now}
                    onEventClick={openEdit}
                    onSlotClick={(date, h, m) => openCreate(date, h, m)}
                    onAllDaySlotClick={date => openCreate(date, 0, 0, true)}
                />
            )}
            {view === 'day' && (
                <DayView
                    date={anchor}
                    events={events}
                    now={now}
                    onEventClick={openEdit}
                    onSlotClick={(date, h, m) => openCreate(date, h, m)}
                    onAllDaySlotClick={date => openCreate(date, 0, 0, true)}
                />
            )}
            {view === 'month' && (
                <MonthView
                    year={anchor.getFullYear()}
                    month={anchor.getMonth()}
                    gridDays={monthGridDays}
                    events={events}
                    now={now}
                    onDayClick={date => { setAnchor(date); setView('day'); }}
                    onEventClick={openEdit}
                    onSlotClick={date => openCreate(date, 0, 0, true)}
                />
            )}

            {/* ── Event modal ── */}
            {draft && (
                <EventModal
                    draft={draft}
                    onClose={() => setDraft(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
