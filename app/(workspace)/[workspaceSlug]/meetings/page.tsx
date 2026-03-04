'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/shared/Avatar';
import { Video, Clock, Users, FileText, ChevronRight, Plus, ExternalLink, FileSignature } from 'lucide-react';

interface Meeting {
    id: number;
    title: string;
    date: string;
    time: string;
    duration: string;
    attendees: string[];
    color: string;
    joinUrl?: string;
    hasNotes?: boolean;
    location?: string;
    status: 'upcoming' | 'live' | 'past';
}

const MEETINGS: Meeting[] = [
    // Today — upcoming
    {
        id: 1,
        title: 'Design Review',
        date: 'Today',
        time: '2:30 PM',
        duration: '60 min',
        attendees: ['Alex Chen', 'Sarah Miller', 'Marcus Li', 'Kabir'],
        color: 'var(--accent-purple)',
        joinUrl: '#',
        location: 'Google Meet',
        status: 'upcoming',
    },
    {
        id: 2,
        title: 'Weekly Engineering Sync',
        date: 'Today',
        time: '4:00 PM',
        duration: '30 min',
        attendees: ['Marcus Li', 'Priya Nair', 'Kabir'],
        color: 'var(--accent-blue)',
        joinUrl: '#',
        location: 'Zoom',
        status: 'upcoming',
    },
    // Tomorrow
    {
        id: 3,
        title: 'Investor Update — Series A',
        date: 'Tomorrow',
        time: '11:00 AM',
        duration: '45 min',
        attendees: ['Priya Nair', 'Kabir'],
        color: 'var(--accent-red)',
        joinUrl: '#',
        location: 'Google Meet',
        status: 'upcoming',
    },
    // Past
    {
        id: 4,
        title: 'Product Vision Brainstorm',
        date: 'Yesterday, 10:00 AM',
        time: '10:00 AM',
        duration: '90 min',
        attendees: ['Alex Chen', 'Kabir'],
        color: 'var(--accent-green)',
        hasNotes: true,
        status: 'past',
    },
    {
        id: 5,
        title: 'Q1 Roadmap Planning',
        date: 'Mon, Mar 2 · 9:00 AM',
        time: '9:00 AM',
        duration: '120 min',
        attendees: ['Alex Chen', 'Sarah Miller', 'Marcus Li', 'Priya Nair', 'Kabir'],
        color: 'var(--accent-blue)',
        hasNotes: true,
        status: 'past',
    },
    {
        id: 6,
        title: 'Engineering All-Hands',
        date: 'Fri, Feb 28 · 4:00 PM',
        time: '4:00 PM',
        duration: '60 min',
        attendees: ['Marcus Li', 'Kabir'],
        color: 'var(--accent-orange)',
        hasNotes: false,
        status: 'past',
    },
];

function AttendeeStack({ attendees, max = 4 }: { attendees: string[]; max?: number }) {
    const visible = attendees.slice(0, max);
    const overflow = attendees.length - max;
    return (
        <div className="flex items-center">
            {visible.map((name, i) => (
                <Avatar
                    key={name}
                    name={name}
                    size={22}
                    className={cn('border-[1.5px] border-bg-primary', i > 0 && '-ml-[5px]')}
                />
            ))}
            {overflow > 0 && (
                <div className="w-[22px] h-[22px] rounded-full bg-bg-active border-[1.5px] border-bg-primary flex items-center justify-center -ml-[5px] text-[10px] font-semibold text-text-muted">
                    +{overflow}
                </div>
            )}
        </div>
    );
}

function UpcomingCard({ meeting }: { meeting: Meeting }) {
    return (
        <div className="flex bg-bg-primary border border-border-default rounded-[10px] overflow-hidden hover:shadow-sm hover:border-border-default transition-all cursor-pointer group">
            {/* Color bar */}
            <div className="w-[3px] shrink-0" style={{ backgroundColor: meeting.color }} />

            <div className="flex-1 p-4 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-text-primary truncate leading-snug">
                            {meeting.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-[12.5px] text-text-muted">
                            <span className="flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                {meeting.time}
                            </span>
                            <span>·</span>
                            <span>{meeting.duration}</span>
                            {meeting.location && (
                                <>
                                    <span>·</span>
                                    <span>{meeting.location}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <span className="text-[11px] font-medium text-text-placeholder shrink-0 mt-0.5">
                        {meeting.date}
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AttendeeStack attendees={meeting.attendees} />
                        <span className="text-[11.5px] text-text-muted">
                            {meeting.attendees.length} {meeting.attendees.length === 1 ? 'attendee' : 'attendees'}
                        </span>
                    </div>
                    {meeting.joinUrl && (
                        <a
                            href={meeting.joinUrl}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-white bg-accent-blue rounded-[6px] hover:bg-accent-blue-hover transition-colors shrink-0"
                        >
                            <Video size={13} />
                            Join
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function PastRow({ meeting }: { meeting: Meeting }) {
    return (
        <div className="group flex items-center gap-4 px-4 py-3 rounded-[8px] border border-border-light hover:border-border-default hover:bg-bg-hover transition-all cursor-pointer">
            {/* Color dot */}
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meeting.color }} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-text-primary truncate">
                        {meeting.title}
                    </span>
                    {meeting.hasNotes && (
                        <span className="flex items-center gap-1 text-[11px] text-text-muted bg-bg-secondary border border-border-light rounded-full px-2 py-0.5 shrink-0">
                            <FileText size={10} />
                            Notes
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[12px] text-text-muted">
                    <span>{meeting.date}</span>
                    <span>·</span>
                    <span>{meeting.duration}</span>
                </div>
            </div>

            <AttendeeStack attendees={meeting.attendees} max={3} />

            <ChevronRight
                size={15}
                className="text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
        </div>
    );
}

export default function MeetingsPage() {
    const params = useParams();
    const workspaceSlug = (params?.workspaceSlug as string) || '';
    const upcoming = MEETINGS.filter(m => m.status === 'upcoming');
    const past = MEETINGS.filter(m => m.status === 'past');

    return (
        <div className="max-w-[820px] mx-auto px-8 py-10 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-[26px] font-semibold text-text-primary tracking-[-0.3px]">Meetings</h1>
                    <p className="text-[13px] text-text-muted mt-1" suppressHydrationWarning>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {upcoming.length} upcoming today
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="#"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-text-secondary border border-border-default rounded-[7px] hover:bg-bg-hover transition-colors"
                    >
                        <ExternalLink size={13} />
                        Connect calendar
                    </a>
                    <Link
                        href={`/${workspaceSlug}/sign`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-accent-blue border border-accent-blue rounded-[7px] hover:bg-accent-blue-soft transition-colors"
                    >
                        <FileSignature size={13} />
                        Sign documents
                    </Link>
                    <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium bg-accent-blue text-white rounded-[7px] hover:bg-accent-blue-hover transition-colors">
                        <Plus size={14} />
                        New meeting
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-10">
                {/* Upcoming */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            Upcoming
                        </h2>
                        <span className="text-[11px] font-semibold bg-bg-secondary border border-border-light text-text-muted rounded-full px-1.5 py-0.5 leading-none">
                            {upcoming.length}
                        </span>
                    </div>

                    {upcoming.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-text-muted border border-dashed border-border-default rounded-[10px]">
                            <Users size={22} />
                            <p className="text-[13px]">No upcoming meetings</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {upcoming.map(meeting => (
                                <UpcomingCard key={meeting.id} meeting={meeting} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Past */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            Past
                        </h2>
                        <span className="text-[11px] font-semibold bg-bg-secondary border border-border-light text-text-muted rounded-full px-1.5 py-0.5 leading-none">
                            {past.length}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {past.map(meeting => (
                            <PastRow key={meeting.id} meeting={meeting} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
