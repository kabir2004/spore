'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { createMeeting, cancelMeeting, linkMeetingNotes } from '@/lib/actions/meetings';
import type { Meeting } from '@/lib/types/meeting';
import {
    Video, Clock, Users, FileText, ChevronRight, Plus, X,
    Calendar, MapPin, Link2, NotebookPen,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatMeetingDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const meetingDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (meetingDay.getTime() === today.getTime()) return 'Today';
    if (meetingDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (meetingDay.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMeetingTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDuration(start: string, end: string): string {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    if (diff < 60) return `${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

function getMeetingStatus(meeting: Meeting): 'live' | 'upcoming' | 'past' {
    const now = Date.now();
    const start = new Date(meeting.start_time).getTime();
    const end = new Date(meeting.end_time).getTime();
    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'past';
}

const STATUS_COLOR: Record<string, string> = {
    scheduled: 'var(--accent-blue)',
    in_progress: 'var(--accent-green)',
    completed: 'var(--text-muted)',
    cancelled: 'var(--accent-red)',
};

// ─── Attendee stack ───────────────────────────────────────────────────────────

function AttendeeStack({ names, max = 4 }: { names: string[]; max?: number }) {
    const visible = names.slice(0, max);
    const overflow = names.length - max;
    return (
        <div className="flex items-center">
            {visible.map((name, i) => (
                <Avatar key={name} name={name} size={22}
                    className={cn('border-[1.5px] border-bg-primary', i > 0 && '-ml-[5px]')} />
            ))}
            {overflow > 0 && (
                <div className="w-[22px] h-[22px] rounded-full bg-bg-active border-[1.5px] border-bg-primary flex items-center justify-center -ml-[5px] text-[10px] font-semibold text-text-muted">
                    +{overflow}
                </div>
            )}
        </div>
    );
}

// ─── Upcoming card ────────────────────────────────────────────────────────────

function UpcomingCard({
    meeting,
    workspaceSlug,
    onCancel,
    onLinkNotes,
    workspaceId,
}: {
    meeting: Meeting;
    workspaceSlug: string;
    onCancel: (id: string) => void;
    onLinkNotes: (id: string, workspaceId: string) => void;
    workspaceId: string;
}) {
    const isLive = getMeetingStatus(meeting) === 'live';
    const names = (meeting.participants ?? []).map((p) => p.name);
    const color = STATUS_COLOR[meeting.status] ?? 'var(--accent-blue)';

    return (
        <div className="flex bg-bg-primary border border-border-default rounded-[10px] overflow-hidden hover:shadow-sm transition-all group">
            <div className="w-[3px] shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-[14px] font-semibold text-text-primary truncate leading-snug">
                                {meeting.title}
                            </h3>
                            {isLive && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-accent-green px-1.5 py-0.5 rounded-full shrink-0">
                                    LIVE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[12.5px] text-text-muted flex-wrap">
                            <span className="flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                {formatMeetingTime(meeting.start_time)}
                            </span>
                            <span>·</span>
                            <span>{formatDuration(meeting.start_time, meeting.end_time)}</span>
                            {meeting.location && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={10} className="shrink-0" />
                                        {meeting.location}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <span className="text-[11px] font-medium text-text-placeholder shrink-0 mt-0.5">
                        {formatMeetingDate(meeting.start_time)}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <AttendeeStack names={names} />
                        <span className="text-[11.5px] text-text-muted">
                            {names.length} {names.length === 1 ? 'attendee' : 'attendees'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {meeting.notes_block_id ? (
                            <Link
                                href={`/${workspaceSlug}/${meeting.notes_block_id}`}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-text-secondary border border-border-default rounded-[6px] hover:bg-bg-hover transition-colors"
                            >
                                <NotebookPen size={12} />
                                Notes
                            </Link>
                        ) : (
                            <button
                                onClick={() => onLinkNotes(meeting.id, workspaceId)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-text-secondary border border-border-default rounded-[6px] hover:bg-bg-hover transition-colors"
                            >
                                <NotebookPen size={12} />
                                Add notes
                            </button>
                        )}
                        {meeting.join_url && (
                            <a
                                href={meeting.join_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-white bg-accent-blue rounded-[6px] hover:bg-accent-blue-hover transition-colors shrink-0"
                            >
                                <Video size={13} />
                                Join
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Past row ─────────────────────────────────────────────────────────────────

function PastRow({
    meeting,
    workspaceSlug,
}: {
    meeting: Meeting;
    workspaceSlug: string;
}) {
    const names = (meeting.participants ?? []).map((p) => p.name);
    const color = STATUS_COLOR[meeting.status] ?? 'var(--text-muted)';

    return (
        <div className="group flex items-center gap-4 px-4 py-3 rounded-[8px] border border-border-light hover:border-border-default hover:bg-bg-hover transition-all cursor-pointer">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-text-primary truncate">
                        {meeting.title}
                    </span>
                    {meeting.notes_block_id && (
                        <Link
                            href={`/${workspaceSlug}/${meeting.notes_block_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] text-text-muted bg-bg-secondary border border-border-light rounded-full px-2 py-0.5 shrink-0 hover:bg-bg-active transition-colors"
                        >
                            <FileText size={10} />
                            Notes
                        </Link>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[12px] text-text-muted">
                    <span>{formatMeetingDate(meeting.start_time)}</span>
                    <span>·</span>
                    <span>{formatMeetingTime(meeting.start_time)}</span>
                    <span>·</span>
                    <span>{formatDuration(meeting.start_time, meeting.end_time)}</span>
                </div>
            </div>
            <AttendeeStack names={names} max={3} />
            <ChevronRight size={15} className="text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
    );
}

// ─── New meeting modal ────────────────────────────────────────────────────────

function NewMeetingModal({
    workspaceId,
    onClose,
    onCreated,
}: {
    workspaceId: string;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        location: '',
        join_url: '',
        description: '',
    });

    function set(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) { setError('Title is required.'); return; }

        const start_time = new Date(`${form.date}T${form.startTime}`).toISOString();
        const end_time = new Date(`${form.date}T${form.endTime}`).toISOString();

        if (new Date(end_time) <= new Date(start_time)) {
            setError('End time must be after start time.');
            return;
        }

        startTransition(async () => {
            const result = await createMeeting({
                workspace_id: workspaceId,
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                start_time,
                end_time,
                location: form.location.trim() || undefined,
                join_url: form.join_url.trim() || undefined,
            });

            if ('error' in result) {
                setError(result.error);
            } else {
                onCreated();
                onClose();
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-bg-primary border border-border-default rounded-[14px] shadow-lg w-full max-w-[480px] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[16px] font-semibold text-text-primary">New meeting</h2>
                    <button onClick={onClose} className="p-1.5 rounded-[6px] hover:bg-bg-hover transition-colors text-text-muted">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Title</label>
                        <input
                            autoFocus
                            value={form.title}
                            onChange={(e) => set('title', e.target.value)}
                            placeholder="Design review, team sync…"
                            className="w-full px-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => set('date', e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Start time</label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(e) => set('startTime', e.target.value)}
                                className="w-full px-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[12px] font-medium text-text-secondary mb-1.5">End time</label>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(e) => set('endTime', e.target.value)}
                                className="w-full px-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Location (optional)</label>
                        <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                value={form.location}
                                onChange={(e) => set('location', e.target.value)}
                                placeholder="Google Meet, Zoom, Conference Room…"
                                className="w-full pl-8 pr-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Join URL (optional)</label>
                        <div className="relative">
                            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                                value={form.join_url}
                                onChange={(e) => set('join_url', e.target.value)}
                                placeholder="https://meet.google.com/…"
                                className="w-full pl-8 pr-3 py-2 text-[14px] bg-bg-secondary border border-border-default rounded-[8px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-[13px] text-accent-red">{error}</p>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-[13.5px] font-medium text-text-secondary border border-border-default rounded-[8px] hover:bg-bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 py-2 text-[13.5px] font-medium text-white bg-accent-blue rounded-[8px] hover:bg-accent-blue-hover transition-colors disabled:opacity-60"
                        >
                            {isPending ? 'Creating…' : 'Create meeting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function MeetingsView({
    meetings,
    workspaceSlug,
    workspaceId,
}: {
    meetings: Meeting[];
    workspaceSlug: string;
    workspaceId: string;
}) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [, startTransition] = useTransition();

    const upcoming = meetings.filter((m) => getMeetingStatus(m) !== 'past' && m.status !== 'cancelled');
    const past = meetings.filter((m) => getMeetingStatus(m) === 'past' || m.status === 'completed');

    function handleCreated() {
        startTransition(() => router.refresh());
    }

    async function handleLinkNotes(meetingId: string, wsId: string) {
        const result = await linkMeetingNotes(meetingId, wsId);
        if ('notesBlockId' in result) {
            startTransition(() => router.refresh());
        }
    }

    async function handleCancel(meetingId: string) {
        await cancelMeeting(meetingId);
        startTransition(() => router.refresh());
    }

    return (
        <>
            {showModal && (
                <NewMeetingModal
                    workspaceId={workspaceId}
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                />
            )}

            <div className="max-w-[820px] mx-auto px-8 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-[26px] font-semibold text-text-primary tracking-[-0.3px]">Meetings</h1>
                        <p className="text-[13px] text-text-muted mt-1" suppressHydrationWarning>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-accent-blue text-white rounded-[7px] hover:bg-accent-blue-hover transition-colors"
                    >
                        <Plus size={14} />
                        New meeting
                    </button>
                </div>

                <div className="flex flex-col gap-10">
                    {/* Upcoming */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Upcoming</h2>
                            <span className="text-[11px] font-semibold bg-bg-secondary border border-border-light text-text-muted rounded-full px-1.5 py-0.5 leading-none">
                                {upcoming.length}
                            </span>
                        </div>

                        {upcoming.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-text-muted border border-dashed border-border-default rounded-[10px]">
                                <Users size={22} />
                                <p className="text-[13px]">No upcoming meetings</p>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="text-[13px] text-accent-blue hover:underline mt-1"
                                >
                                    Schedule one
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {upcoming.map((meeting) => (
                                    <UpcomingCard
                                        key={meeting.id}
                                        meeting={meeting}
                                        workspaceSlug={workspaceSlug}
                                        workspaceId={workspaceId}
                                        onCancel={handleCancel}
                                        onLinkNotes={handleLinkNotes}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Past */}
                    {past.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Past</h2>
                                <span className="text-[11px] font-semibold bg-bg-secondary border border-border-light text-text-muted rounded-full px-1.5 py-0.5 leading-none">
                                    {past.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {past.map((meeting) => (
                                    <PastRow key={meeting.id} meeting={meeting} workspaceSlug={workspaceSlug} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
