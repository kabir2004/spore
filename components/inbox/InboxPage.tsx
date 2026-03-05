'use client';

import React, { useState, useMemo } from 'react';
import {
    Search, Star, Archive, MoreHorizontal, Reply,
    X, Send, RefreshCw, Inbox, Mail,
} from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';

type Provider = 'gmail' | 'outlook';
type OAuthStep = 'email' | 'permissions' | 'connecting' | 'done';
type Tab = 'all' | 'unread' | 'starred';

interface Email {
    id: string;
    from: string;
    fromEmail: string;
    subject: string;
    preview: string;
    body: string;
    date: string;
    unread: boolean;
    starred: boolean;
    archived: boolean;
}

const PROVIDER_CONFIG: Record<Provider, {
    name: string;
    domain: string;
    accentColor: string;
    permissions: string[];
}> = {
    gmail: {
        name: 'Gmail',
        domain: 'gmail.com',
        accentColor: '#EA4335',
        permissions: [
            'Read your email messages and settings',
            'View your profile and email address',
            'Mark messages as read or unread',
        ],
    },
    outlook: {
        name: 'Outlook',
        domain: 'outlook.com',
        accentColor: '#0078D4',
        permissions: [
            'Read your Outlook mail messages',
            'View your email address and profile info',
            'Access your inbox, sent, and draft folders',
        ],
    },
};

const MOCK_EMAILS: Email[] = [
    {
        id: 'e1',
        from: 'Alex Chen',
        fromEmail: 'alex.chen@company.co',
        subject: 'Re: Q3 Roadmap Review',
        preview: "I've updated the deck with the latest numbers from our data team. Let me know if everything looks good before I share with the board.",
        body: `Hi Kabir,\n\nI've updated the deck with the latest numbers from our data team. The revenue projections look much stronger now — we're tracking at about 18% above our Q2 baseline.\n\nA few things I wanted to flag:\n\n1. Slide 7 has the new retention chart. I think it tells a great story.\n2. I added a competitive landscape section on slides 12–14 based on your earlier feedback.\n3. The appendix now includes all the raw data exports.\n\nLet me know if everything looks good before I share it with the board. Happy to jump on a quick call if anything needs adjustment.\n\nBest,\nAlex`,
        date: '10:42 AM',
        unread: true,
        starred: true,
        archived: false,
    },
    {
        id: 'e2',
        from: 'GitHub',
        fromEmail: 'noreply@github.com',
        subject: '[spore] Deployment failed on main',
        preview: 'Your deployment for commit abc1234 on the main branch has failed. Click to view the full build log.',
        body: `Your recent deployment has failed.\n\nRepository: spore-app/spore\nBranch: main\nCommit: abc1234f — "feat: add real-time block sync"\nTriggered by: kabir\n\nError:\n  Build failed at step "npm run build"\n  Exit code: 1\n  Error: Type error in components/editor/BlockRenderer.tsx\n  TS2339: Property 'open' does not exist on type 'BlockProperties'\n\nView full logs → github.com/spore-app/spore/actions/runs/12345\n\n—\nYou are receiving this because you are subscribed to deployment notifications.`,
        date: '09:12 AM',
        unread: true,
        starred: false,
        archived: false,
    },
    {
        id: 'e3',
        from: 'Sarah Miller',
        fromEmail: 'sarah@designstudio.io',
        subject: 'Re: Design System updates',
        preview: 'The new color palette is amazing! I will start implementing it across all components tomorrow morning.',
        body: `Hey Kabir!\n\nJust went through the updated design system docs — the new color palette is amazing. I especially love the way the accent blues feel against the secondary backgrounds. Very clean.\n\nI'll start implementing across the components tomorrow morning. Planning to start with the sidebar and topbar, then move to the editor surfaces.\n\nOne question: for the hover states on interactive elements, should I stick to bg-hover or is there a case for using a slightly elevated shadow instead? I've seen both approaches in the Figma comps.\n\nLet me know!\n\nSarah`,
        date: 'Yesterday',
        unread: false,
        starred: false,
        archived: false,
    },
    {
        id: 'e4',
        from: 'Marcus Li',
        fromEmail: 'marcus.li@company.co',
        subject: 'Weekly Engineering Digest — Week 9',
        preview: 'This week: block sync POC, design token finalization, and Q3 planning kick-off. Great momentum across the board.',
        body: `Hi team,\n\nHere's your weekly engineering digest for Week 9:\n\nShipped this week:\n- Block architecture v1 complete (Kabir)\n- Design token system finalized (Sarah)\n- CI/CD pipeline updates (DevOps)\n\nIn progress:\n- Real-time sync engine POC\n- Mobile responsiveness pass\n- Performance audit\n\nNotable:\nWe hit 98.7% uptime this week. Deployment frequency is up 40% QoQ. Keep it up everyone.\n\nNext week:\nQ3 planning kicks off Tuesday. Block comments feature moves to active development.\n\nCheers,\nMarcus`,
        date: 'Yesterday',
        unread: false,
        starred: false,
        archived: false,
    },
    {
        id: 'e5',
        from: 'Priya Nair',
        fromEmail: 'priya@vcpartners.com',
        subject: 'Follow-up: investor update + next steps',
        preview: 'Great meeting last Thursday. I wanted to follow up on the metrics you shared and discuss potential next steps for the Series A.',
        body: `Hi Kabir,\n\nReally enjoyed our meeting last Thursday — the team's energy is palpable and the product demo was genuinely impressive.\n\nI wanted to follow up on the metrics you shared and discuss potential next steps.\n\nA few things from our side:\n\n1. The ARR trajectory is compelling. If you can hold 15%+ MoM, the Series A story writes itself.\n2. Our partners are particularly interested in your retention numbers — can you share a cohort breakdown?\n3. We'd like to schedule a technical deep-dive with our engineering partner. Would mid-March work?\n\nLooking forward to continuing the conversation.\n\nWarm regards,\nPriya Nair\nPartner, VC Partners`,
        date: 'Mon',
        unread: true,
        starred: true,
        archived: false,
    },
    {
        id: 'e6',
        from: 'Notion',
        fromEmail: 'news@mail.notion.so',
        subject: "What's new in Notion — March 2026",
        preview: "Introducing AI autofill for databases, improved PDF exports, and the new Notion Calendar. Here's what's shipping this month.",
        body: `What's new in Notion\nMarch 2026 Edition\n\nAI autofill for databases\nNotion AI can now automatically fill in database properties based on the content of your pages. Just select a property and let AI do the work.\n\nImproved PDF export\nExport any page to a beautifully formatted PDF, with full support for tables, embeds, and callouts.\n\nNotion Calendar is here\nA dedicated calendar view for all your Notion databases — finally. Connect your Google Calendar too.\n\nAnd more:\n- Faster load times across all surfaces\n- New block types: Mermaid diagrams, GitHub code snippets\n- Mobile: redesigned sidebar and quick add\n\nAs always, thank you for building with Notion.\n\n— The Notion Team`,
        date: 'Sun',
        unread: false,
        starred: false,
        archived: false,
    },
];

// --- OAuthModal ---

function OAuthModal({ provider, onConnected, onClose }: {
    provider: Provider;
    onConnected: (email: string) => void;
    onClose: () => void;
}) {
    const [step, setStep] = useState<OAuthStep>('email');
    const [email, setEmail] = useState('');
    const config = PROVIDER_CONFIG[provider];

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStep('permissions');
    };

    const handleAllow = () => {
        setStep('connecting');
        setTimeout(() => {
            setStep('done');
            setTimeout(() => onConnected(email || `user@${config.domain}`), 700);
        }, 1400);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="w-[400px] bg-bg-primary rounded-[12px] border border-border-default shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-[20px] h-[20px] rounded-full shrink-0"
                            style={{ backgroundColor: config.accentColor }}
                        />
                        <span className="text-[14px] font-semibold text-text-primary">
                            Connect {config.name}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-placeholder hover:text-text-secondary transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5">
                    {step === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                            <p className="text-[13px] text-text-secondary">
                                Enter your {config.name} address to connect your inbox.
                            </p>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={`you@${config.domain}`}
                                autoFocus
                                className="w-full px-3 py-2 text-[13.5px] bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!email.trim()}
                                className="w-full py-2 rounded-[6px] text-[13.5px] font-medium text-white transition-opacity disabled:opacity-40"
                                style={{ backgroundColor: config.accentColor }}
                            >
                                Continue
                            </button>
                        </form>
                    )}

                    {step === 'permissions' && (
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-[13.5px] font-medium text-text-primary mb-1">
                                    spore wants access to your {config.name} account
                                </p>
                                <p className="text-[12.5px] text-text-muted">{email}</p>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {config.permissions.map((perm, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-green mt-1.5 shrink-0" />
                                        <span className="text-[13px] text-text-secondary">{perm}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 rounded-[6px] text-[13.5px] font-medium text-text-secondary bg-bg-secondary border border-border-default hover:bg-bg-hover transition-colors"
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={handleAllow}
                                    className="flex-1 py-2 rounded-[6px] text-[13.5px] font-medium text-white transition-opacity"
                                    style={{ backgroundColor: config.accentColor }}
                                >
                                    Allow
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'connecting' && (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <RefreshCw size={24} className="text-text-muted animate-spin" />
                            <p className="text-[13.5px] text-text-secondary">
                                Connecting to {config.name}...
                            </p>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[18px] font-semibold"
                                style={{ backgroundColor: config.accentColor }}
                            >
                                ✓
                            </div>
                            <p className="text-[13.5px] text-text-secondary">Connected successfully!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- EmailRow ---

function EmailRow({ email, isSelected, onSelect, onStar }: {
    email: Email;
    isSelected: boolean;
    onSelect: () => void;
    onStar: () => void;
}) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                'group relative flex items-start gap-3 px-5 py-3.5 border-b border-border-light cursor-pointer transition-colors',
                isSelected
                    ? 'bg-bg-active'
                    : email.unread
                        ? 'bg-bg-primary hover:bg-bg-secondary'
                        : 'bg-bg-secondary/40 hover:bg-bg-secondary'
            )}
        >
            {email.unread && !isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-blue rounded-r-full" />
            )}
            <Avatar name={email.from} size={34} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                        'truncate text-[13.5px]',
                        email.unread ? 'font-semibold text-text-primary' : 'font-normal text-text-secondary'
                    )}>
                        {email.from}
                    </span>
                    <span className="text-[11.5px] text-text-muted whitespace-nowrap ml-2 shrink-0">
                        {email.date}
                    </span>
                </div>
                <div className={cn(
                    'truncate text-[13px] mb-0.5',
                    email.unread ? 'font-medium text-text-primary' : 'text-text-secondary'
                )}>
                    {email.subject}
                </div>
                <div className="truncate text-[12.5px] text-text-muted">
                    {email.preview}
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onStar(); }}
                className={cn(
                    'mt-0.5 shrink-0 transition-all',
                    email.starred
                        ? 'text-accent-orange opacity-100'
                        : 'text-text-placeholder opacity-0 group-hover:opacity-100'
                )}
            >
                <Star size={15} className={email.starred ? 'fill-accent-orange' : ''} />
            </button>
        </div>
    );
}

// --- Main InboxPage ---

export function InboxPage() {
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [provider, setProvider] = useState<Provider | null>(null);
    const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
    const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyText, setReplyText] = useState('');

    const handleConnected = (email: string) => {
        setConnectedEmail(email);
        setProvider(pendingProvider);
        setPendingProvider(null);
    };

    const handleSelectEmail = (id: string) => {
        setSelectedId(id);
        setReplyOpen(false);
        setReplyText('');
        setEmails(prev => prev.map(e => e.id === id ? { ...e, unread: false } : e));
    };

    const handleStar = (id: string) => {
        setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !e.starred } : e));
    };

    const handleArchive = (id: string) => {
        setEmails(prev => prev.map(e => e.id === id ? { ...e, archived: true } : e));
        if (selectedId === id) setSelectedId(null);
    };

    const handleDisconnect = () => {
        setConnectedEmail(null);
        setProvider(null);
        setSelectedId(null);
        setReplyOpen(false);
        setReplyText('');
    };

    const unreadCount = emails.filter(e => !e.archived && e.unread).length;
    const starredCount = emails.filter(e => !e.archived && e.starred).length;

    const filteredEmails = useMemo(() => {
        return emails
            .filter(e => !e.archived)
            .filter(e => {
                if (activeTab === 'unread') return e.unread;
                if (activeTab === 'starred') return e.starred;
                return true;
            })
            .filter(e => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                    e.from.toLowerCase().includes(q) ||
                    e.subject.toLowerCase().includes(q) ||
                    e.preview.toLowerCase().includes(q)
                );
            });
    }, [emails, activeTab, searchQuery]);

    const selectedEmail = selectedId ? emails.find(e => e.id === selectedId) ?? null : null;

    const TABS: { id: Tab; label: string; count?: number }[] = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread', count: unreadCount },
        { id: 'starred', label: 'Starred', count: starredCount },
    ];

    // Disconnected state — same layout as Sign page: absolute inset-0, centered
    if (!connectedEmail) {
        return (
            <>
                {pendingProvider && (
                    <OAuthModal
                        provider={pendingProvider}
                        onConnected={handleConnected}
                        onClose={() => setPendingProvider(null)}
                    />
                )}
                <div className="absolute inset-0 flex items-center justify-center w-full px-6 py-12">
                    <div className="flex flex-col items-center text-center max-w-[440px] w-full">
                        <div className="mb-8 w-16 h-16 rounded-2xl bg-bg-elevated border border-border-default flex items-center justify-center shadow-sm">
                            <Inbox size={32} className="text-text-primary" />
                        </div>
                        <h1 className="text-[24px] font-bold tracking-tight text-text-primary mb-2">
                            Connect your inbox
                        </h1>
                        <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
                            Connect Gmail or Outlook to see all your messages directly in spore.
                        </p>
                        <div className="flex flex-col w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setPendingProvider('gmail')}
                                className="relative flex items-center justify-center w-full h-11 px-4 text-[15px] font-medium text-text-primary bg-bg-primary border border-border-default rounded-md hover:bg-bg-hover hover:border-border-light transition-all active:scale-[0.98]"
                            >
                                <div className="absolute left-4 w-5 h-5 rounded-full bg-[#EA4335] shrink-0" />
                                <span className="text-[15px] font-medium">Connect Gmail</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingProvider('outlook')}
                                className="relative flex items-center justify-center w-full h-11 px-4 text-[15px] font-medium text-text-primary bg-bg-primary border border-border-default rounded-md hover:bg-bg-hover hover:border-border-light transition-all active:scale-[0.98]"
                            >
                                <div className="absolute left-4 w-5 h-5 rounded-full bg-[#0078D4] shrink-0" />
                                <span className="text-[15px] font-medium">Connect Outlook</span>
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Connected state — centered max-width layout
    return (
        <div className="min-h-full flex flex-col items-center">
            <div className="w-full max-w-6xl mx-auto flex flex-1 min-h-0 overflow-hidden">
            {/* Left pane — email list */}
            <div className="w-[340px] border-r border-border-default flex flex-col shrink-0 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-border-default shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-[16px] font-semibold text-text-primary">Inbox</h1>
                        {unreadCount > 0 && (
                            <span className="text-[11px] font-semibold bg-accent-blue text-white rounded-full px-1.5 py-0.5 leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-[6px] border border-border-light">
                        <Search size={13} className="text-text-placeholder shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search messages..."
                            className="flex-1 text-[13px] bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border-light shrink-0 px-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-[2px] transition-colors -mb-px',
                                activeTab === tab.id
                                    ? 'border-text-primary text-text-primary font-medium'
                                    : 'border-transparent text-text-muted hover:text-text-secondary'
                            )}
                        >
                            {tab.label}
                            {tab.count != null && tab.count > 0 && (
                                <span className="text-[11px] font-semibold bg-bg-hover text-text-muted rounded-full px-1.5 py-0.5 leading-none">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Email list */}
                <div className="flex-1 overflow-y-auto">
                    {filteredEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                            <Mail size={22} />
                            <span className="text-[13px]">No messages</span>
                        </div>
                    ) : (
                        filteredEmails.map(email => (
                            <EmailRow
                                key={email.id}
                                email={email}
                                isSelected={selectedId === email.id}
                                onSelect={() => handleSelectEmail(email.id)}
                                onStar={() => handleStar(email.id)}
                            />
                        ))
                    )}
                </div>

                {/* Footer: connected account + disconnect */}
                <div className="px-4 py-3 border-t border-border-light shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: provider === 'gmail' ? '#EA4335' : '#0078D4' }}
                        />
                        <span className="text-[12px] text-text-muted truncate">{connectedEmail}</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="text-[11.5px] text-text-placeholder hover:text-text-muted transition-colors shrink-0 ml-2"
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            {/* Right pane — email detail */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedEmail ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-muted">
                        <Mail size={28} />
                        <span className="text-[14px]">Select a message to read</span>
                    </div>
                ) : (
                    <>
                        {/* Email header */}
                        <div className="px-8 pt-7 pb-5 border-b border-border-light shrink-0">
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <h2 className="text-[20px] font-semibold text-text-primary leading-tight">
                                    {selectedEmail.subject}
                                </h2>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                        onClick={() => handleStar(selectedEmail.id)}
                                        className={cn(
                                            'p-1.5 rounded-[5px] hover:bg-bg-hover transition-colors',
                                            selectedEmail.starred ? 'text-accent-orange' : 'text-text-muted'
                                        )}
                                        title="Star"
                                    >
                                        <Star size={16} className={selectedEmail.starred ? 'fill-accent-orange' : ''} />
                                    </button>
                                    <button
                                        onClick={() => handleArchive(selectedEmail.id)}
                                        className="p-1.5 rounded-[5px] text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
                                        title="Archive"
                                    >
                                        <Archive size={16} />
                                    </button>
                                    <button
                                        className="p-1.5 rounded-[5px] text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
                                        title="More options"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Avatar name={selectedEmail.from} size={36} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13.5px] font-semibold text-text-primary">
                                            {selectedEmail.from}
                                        </span>
                                        <span className="text-[12.5px] text-text-muted">
                                            &lt;{selectedEmail.fromEmail}&gt;
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-text-muted mt-0.5">
                                        To: {connectedEmail} · {selectedEmail.date}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Email body */}
                        <div className="flex-1 overflow-y-auto px-8 py-6">
                            <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                                {selectedEmail.body}
                            </p>
                        </div>

                        {/* Reply composer */}
                        <div className="px-8 pb-6 pt-2 shrink-0">
                            {!replyOpen ? (
                                <button
                                    onClick={() => setReplyOpen(true)}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-[7px] border border-border-default bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors text-[13px]"
                                >
                                    <Reply size={14} />
                                    <span>Reply</span>
                                </button>
                            ) : (
                                <div className="border border-border-default rounded-[8px] overflow-hidden bg-bg-primary shadow-sm">
                                    <div className="px-4 py-2.5 border-b border-border-light text-[12.5px] text-text-muted flex items-center gap-3">
                                        <span className="shrink-0 w-8">From:</span>
                                        <span className="text-text-secondary">{connectedEmail}</span>
                                    </div>
                                    <div className="px-4 py-2.5 border-b border-border-light text-[12.5px] text-text-muted flex items-center gap-3">
                                        <span className="shrink-0 w-8">To:</span>
                                        <span className="text-text-secondary">{selectedEmail.fromEmail}</span>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="w-full px-4 py-3 text-[13.5px] text-text-primary placeholder:text-text-placeholder bg-transparent outline-none resize-none min-h-[120px]"
                                    />
                                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-light">
                                        <button
                                            onClick={() => { setReplyOpen(false); setReplyText(''); }}
                                            className="text-[13px] text-text-muted hover:text-text-secondary transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            disabled={!replyText.trim()}
                                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] bg-accent-blue text-white text-[13px] font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <Send size={13} />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            </div>
        </div>
    );
}
