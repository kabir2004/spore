import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
    return (
        <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-8 lg:px-12 h-[58px]"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
        >
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
                <div className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] bg-[#FAFAF9] border border-[#E8E8E3] overflow-hidden shadow-sm shrink-0">
                    <Image src="/sporelighticon.png" alt="spore" width={22} height={22} className="object-contain" />
                </div>
                <span className="text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.4px]">spore</span>
            </Link>

            <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
                {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#', 'Docs'], ['#', 'Blog']].map(([href, label]) => (
                    <a key={label} href={href}
                        className="text-[13.5px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors duration-150"
                    >
                        {label}
                    </a>
                ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <Link href="/login"
                    className="px-3.5 py-[7px] text-[13px] font-medium text-[#0A0A0A] border border-[#E8E8E3] rounded-[8px] hover:border-[#C8C8C4] hover:bg-[#FAFAF9] transition-colors duration-150"
                >
                    Sign in
                </Link>
                <Link href="/signup"
                    className="flex items-center gap-1.5 px-3.5 py-[7px] text-[13px] font-medium text-white bg-[#0A0A0A] rounded-[8px] hover:bg-[#222] transition-colors duration-150"
                >
                    Get started
                </Link>
            </div>
        </nav>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
    return (
        <section className="flex flex-col items-center text-center px-6 pt-[136px] pb-20">
            <h1 className="text-[64px] md:text-[80px] lg:text-[96px] font-bold tracking-[-3.5px] leading-[0.96] text-[#0A0A0A] max-w-[860px] mb-6">
                One workspace.<br />Every decision.
            </h1>

            <p className="text-[16px] text-[#5C5C5C] max-w-[420px] leading-[1.6] mb-9 tracking-[-0.1px]">
                Notes, meetings, and decisions → connected. Context stays where it belongs.
            </p>

            <div className="flex items-center gap-3">
                <Link href="/signup"
                    className="flex items-center gap-2 px-5 py-[10px] text-[14px] font-semibold text-white bg-[#0A0A0A] rounded-[9px] hover:bg-[#222] transition-colors duration-150"
                >
                    Start for free
                    <ArrowRight size={14} strokeWidth={2.2} />
                </Link>
                <Link href="/login"
                    className="px-5 py-[10px] text-[14px] font-medium text-[#0A0A0A] border border-[#E8E8E3] rounded-[9px] hover:border-[#C8C8C4] hover:bg-[#FAFAF9] transition-colors duration-150"
                >
                    Sign in
                </Link>
            </div>

            {/* Product screenshot */}
            <div className="mt-16 w-full max-w-[960px] rounded-[14px] overflow-hidden border border-[#E8E8E3]" style={{ transform: 'translateZ(0)' }}>
                <Image
                    src="/landingpageimage6.png"
                    alt="spore workspace"
                    width={1920}
                    height={1080}
                    className="w-full h-auto block"
                    priority
                />
            </div>
        </section>
    );
}

// ─── Feature rows ─────────────────────────────────────────────────────────────

function FeatureRows() {
    const items = [
        {
            index: '01',
            title: 'Write anything, structured.',
            body: 'A block-based editor that handles text, code, tables, callouts, equations, and embedded media → all in one canvas. Structure appears as you write, not after.',
        },
        {
            index: '02',
            title: 'Meetings attached to decisions.',
            body: 'Schedule meetings, write notes inside the event, and link action items directly to pages. Nothing falls out of context when the call ends.',
        },
        {
            index: '03',
            title: 'The whole team, one source.',
            body: 'Real-time sync keeps every collaborator on the same version. Granular permissions let you share exactly what you intend → nothing more.',
        },
    ];

    return (
        <section className="px-8 lg:px-12 pb-16">
            <div className="max-w-[880px] mx-auto">
                {items.map(({ index, title, body }) => (
                    <div key={index}
                        className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-x-8 py-10 border-b border-[#F0F0EC] last:border-0"
                    >
                        <span className="text-[13px] font-medium text-[#B4B4B0] tabular-nums pt-1">{index}</span>
                        <div>
                            <h3 className="text-[20px] md:text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.5px] mb-3 leading-snug">
                                {title}
                            </h3>
                            <p className="text-[15px] text-[#6B6B6B] leading-[1.7] max-w-[520px]">
                                {body}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── Bento features ───────────────────────────────────────────────────────────

function Features() {
    const CardFooter = ({ label, title, desc, dark = false }: { label: string; title: string; desc: string; dark?: boolean }) => (
        <div className="shrink-0">
            <p className={`text-[9.5px] font-semibold uppercase tracking-[0.12em] mb-[3px] ${dark ? 'text-[#444]' : 'text-[#C0C0BB]'}`}>{label}</p>
            <h3 className={`text-[14px] font-semibold tracking-[-0.3px] leading-snug ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{title}</h3>
            <p className={`text-[12px] mt-[3px] leading-[1.45] ${dark ? 'text-[#555]' : 'text-[#6B6B6B]'}`}>{desc}</p>
        </div>
    );

    return (
        <section id="features" className="px-8 lg:px-12 pb-28">
            <div className="max-w-[880px] mx-auto">

                <div className="mb-10">
                    <h2 className="text-[42px] md:text-[52px] font-bold tracking-[-2px] text-[#0A0A0A] leading-[1.05]">
                        Everything in one place.
                    </h2>
                    <p className="text-[15px] text-[#6B6B6B] mt-3 max-w-[400px] leading-[1.6]">
                        Notes, meetings, AI, and contracts → built to work together.
                    </p>
                </div>

                {/* gridAutoRows: each row exactly 245px → all same-row cards identical height */}
                <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    style={{ gridAutoRows: '245px' }}
                >

                    {/* ── Editor (2 cols × 2 rows) ── */}
                    <div className="md:col-span-2 md:row-span-2 rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        {/* Scrollable editor preview → fade at bottom signals more content */}
                        <div className="relative flex-1 min-h-0 mb-3 overflow-hidden">
                            <div className="flex flex-col gap-[5px]">
                                {[
                                    { sym: 'H₁',  w: '48%' },
                                    { sym: '¶',   w: '72%' },
                                    { sym: '¶',   w: '60%', dim: true },
                                    { sym: '{ }', w: '82%', mono: true, bg: '#F3F3F0' },
                                    { sym: '⊞',   w: '62%' },
                                    { sym: '💡',  w: '78%', tinted: true },
                                    { sym: '∑',   w: '50%' },
                                    { sym: '▶',   w: '64%' },
                                    { sym: '¶',   w: '55%', dim: true },
                                    { sym: '→',   w: '90%', dim: true },
                                ].map(({ sym, w, mono, tinted, bg, dim }, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 px-3 py-[6px] rounded-[6px] shrink-0"
                                        style={{
                                            background: tinted ? '#EEF4FD' : (bg ?? 'white'),
                                            border: `1px solid ${tinted ? '#D0E3F8' : '#EAEAE6'}`,
                                            opacity: dim ? 0.45 : 1,
                                        }}
                                    >
                                        <span className={`text-[10px] text-[#B4B4B0] w-5 text-center shrink-0 select-none leading-none ${mono ? 'font-mono' : ''}`}>{sym}</span>
                                        <div className="h-[6px] rounded-[3px]" style={{ width: w, background: tinted ? '#B8D0EC' : '#E0E0DC' }} />
                                    </div>
                                ))}
                            </div>
                            {/* Fade → makes editor look like scrollable content */}
                            <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #FAFAF9)' }} />
                        </div>
                        <CardFooter label="Editor" title="Every block type you need." desc="Text, code, tables, callouts, equations, and embeds → all in one canvas." />
                    </div>

                    {/* ── AI ── */}
                    <div className="rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3 flex flex-col gap-[6px] overflow-hidden">
                            {[
                                { name: 'Claude Sonnet 4', dot: '#D97706' },
                                { name: 'GPT-4o',          dot: '#059669' },
                                { name: 'Gemini 1.5 Pro',  dot: '#2563EB' },
                            ].map(({ name, dot }) => (
                                <div key={name} className="flex items-center gap-2.5 px-3 py-[8px] rounded-[8px] bg-white border border-[#E8E8E3] shrink-0">
                                    <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: dot }} />
                                    <span className="text-[12px] font-medium text-[#2A2A2A]">{name}</span>
                                </div>
                            ))}
                            {/* Prompt bar */}
                            <div className="mt-1 flex items-center gap-2 px-3 py-[8px] rounded-[8px] bg-white border border-[#E8E8E3]">
                                <div className="h-[6px] flex-1 rounded-[3px] bg-[#EAEAE6]" />
                                <div className="w-[18px] h-[18px] rounded-[5px] bg-[#0A0A0A] shrink-0 flex items-center justify-center">
                                    <div className="w-[7px] h-[7px] rounded-[1px] bg-white opacity-80" />
                                </div>
                            </div>
                        </div>
                        <CardFooter label="AI" title="Your choice of model." desc="Switch between Claude, GPT-4o, and Gemini." />
                    </div>

                    {/* ── Meetings ── */}
                    <div className="rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3">
                            <div className="h-full rounded-[10px] bg-white border border-[#E8E8E3] p-3 flex flex-col justify-between overflow-hidden">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="h-[7px] w-28 rounded-[3px] bg-[#DDDDD8]" />
                                        <span className="text-[8.5px] font-semibold px-1.5 py-[2px] rounded-[4px] text-[#2563EB]" style={{ background: '#EEF4FD', border: '1px solid #C7DDF8' }}>Live</span>
                                    </div>
                                    <div className="text-[9.5px] text-[#ADADAA] mt-0.5">Today · 10:00 → 11:00 AM</div>
                                    <div className="mt-2.5 flex flex-col gap-1.5">
                                        <div className="h-[5px] rounded-[3px] bg-[#EAEAE6] w-full" />
                                        <div className="h-[5px] rounded-[3px] bg-[#EAEAE6] w-4/5" />
                                        <div className="h-[5px] rounded-[3px] bg-[#EAEAE6] w-3/5" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-1.5">
                                        {['#E8D5C4','#C4D8E8','#C4E8D4','#E8C4E8'].map((c, i) => (
                                            <div key={i} className="w-[22px] h-[22px] rounded-full shrink-0" style={{ background: c, border: '2px solid white' }} />
                                        ))}
                                    </div>
                                    <span className="text-[9.5px] text-[#ADADAA]">+2 attending</span>
                                </div>
                            </div>
                        </div>
                        <CardFooter label="Meetings" title="Linked to the rest of your work." desc="Notes, action items, and decisions → all connected." />
                    </div>

                    {/* ── Calendar ── */}
                    <div className="rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3 overflow-hidden">
                            <div className="grid grid-cols-7 gap-x-[1px] gap-y-[1px]">
                                {['M','T','W','T','F','S','S'].map((d, i) => (
                                    <div key={i} className="text-[8px] text-center text-[#C8C8C4] font-semibold pb-1.5">{d}</div>
                                ))}
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
                                    <div key={n} className={`text-[9px] text-center py-[4px] rounded-[3px] leading-none font-medium ${
                                        n === 15 ? 'bg-[#0A0A0A] text-white'
                                        : n === 8 || n === 22 ? 'text-[#2383E2]'
                                        : 'text-[#ADADAA]'
                                    }`}>{n}</div>
                                ))}
                            </div>
                        </div>
                        <CardFooter label="Calendar" title="Your whole week at a glance." desc="Events, deadlines, and meetings in one view." />
                    </div>

                    {/* ── Inbox ── */}
                    <div className="rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3 flex flex-col gap-[6px] overflow-hidden">
                            {[
                                { unread: true,  nw: 72 },
                                { unread: false, nw: 54 },
                                { unread: true,  nw: 64 },
                                { unread: false, nw: 48 },
                            ].map(({ unread, nw }, i) => (
                                <div key={i} className="flex items-center gap-2 px-2.5 py-[7px] rounded-[7px] bg-white border border-[#EAEAE6] shrink-0">
                                    <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${unread ? 'bg-[#2383E2]' : 'bg-[#DDDDD8]'}`} />
                                    <div className="h-[6px] rounded-[3px] bg-[#CCCCCA] shrink-0" style={{ width: nw }} />
                                    <div className="h-[6px] rounded-[3px] bg-[#EAEAE6] flex-1" />
                                </div>
                            ))}
                        </div>
                        <CardFooter label="Inbox" title="Email, unified." desc="Threads organized and linked to your workspace." />
                    </div>

                    {/* ── Sign ── */}
                    <div className="rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3 flex items-center">
                            <div className="w-full rounded-[10px] bg-white border border-[#E8E8E3] p-3.5">
                                <div className="h-[6px] w-full rounded-[3px] bg-[#EAEAE6] mb-1.5" />
                                <div className="h-[6px] w-4/5 rounded-[3px] bg-[#EAEAE6] mb-5" />
                                <div className="border-b border-dashed border-[#C8C8C4] pb-1">
                                    <span className="text-[15px] text-[#2A2A2A] italic" style={{ fontFamily: 'Georgia, serif' }}>K. Sharma</span>
                                </div>
                                <p className="mt-1.5 text-[9px] text-[#ADADAA]">Signed · Mar 4, 2026</p>
                            </div>
                        </div>
                        <CardFooter label="Sign" title="Sign without leaving." desc="Send and collect signatures right in your workspace." />
                    </div>

                    {/* ── Collaboration (2 cols wide) ── */}
                    <div className="md:col-span-2 rounded-[16px] border border-[#E8E8E3] bg-[#FAFAF9] overflow-hidden flex flex-col p-5">
                        {/* 2×2 grid of presence pills → fills the full width evenly */}
                        <div className="flex-1 min-h-0 mb-3 grid grid-cols-2 gap-2 content-center overflow-hidden">
                            {[
                                { init: 'K', color: '#E8D5C4', page: 'Roadmap Q2',    status: 'editing' },
                                { init: 'S', color: '#C4D8E8', page: 'Sprint notes',  status: 'viewing' },
                                { init: 'M', color: '#C4E8D4', page: 'Product brief', status: 'editing' },
                                { init: 'A', color: '#E8C4E0', page: 'OKRs 2026',     status: 'viewing' },
                            ].map(({ init, color, page, status }) => (
                                <div key={init} className="flex items-center gap-2 px-2.5 py-[8px] rounded-[9px] bg-white border border-[#E8E8E3]">
                                    <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-[9px] font-semibold text-[#3A3A3A] shrink-0" style={{ background: color }}>{init}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11.5px] font-medium text-[#1A1A1A] truncate leading-none mb-[3px]">{page}</p>
                                        <p className="text-[10px] text-[#ADADAA] leading-none">{status}</p>
                                    </div>
                                    <div className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: status === 'editing' ? '#0F7B6C' : '#DDDDD8' }} />
                                </div>
                            ))}
                        </div>
                        <CardFooter label="Collaboration" title="Everyone on the same page." desc="Live presence, instant sync, and role-based permissions → built in from day one." />
                    </div>

                    {/* ── Permissions (dark) ── */}
                    <div className="rounded-[16px] border border-[#1A1A1A] bg-[#0A0A0A] overflow-hidden flex flex-col p-5">
                        <div className="flex-1 min-h-0 mb-3 flex flex-col justify-center gap-3.5 overflow-hidden">
                            {[
                                { role: 'Owner',  pct: '100%', opacity: 1    },
                                { role: 'Editor', pct: '65%',  opacity: 0.5  },
                                { role: 'Viewer', pct: '35%',  opacity: 0.25 },
                            ].map(({ role, pct, opacity }) => (
                                <div key={role} className="flex items-center gap-3">
                                    <span className="text-[10.5px] w-10 shrink-0 text-[#666]">{role}</span>
                                    <div className="flex-1 h-[5px] rounded-full bg-[#1C1C1C]">
                                        <div className="h-full rounded-full bg-white" style={{ width: pct, opacity }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <CardFooter dark label="Permissions" title="Share what you intend." desc="Role-based access with block-level sharing." />
                    </div>

                </div>
            </div>
        </section>
    );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
    {
        name: 'Free',
        price: '$0',
        sub: 'No credit card required',
        features: ['Up to 5 members', 'Unlimited blocks', 'Meetings & notes', '5 GB storage'],
        cta: 'Get started',
        href: '/signup',
        dark: false,
    },
    {
        name: 'Pro',
        price: '$12',
        sub: 'per member / month',
        features: ['Unlimited members', 'Advanced permissions', 'API access', '100 GB storage', 'Priority support'],
        cta: 'Start free trial',
        href: '/signup',
        dark: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        sub: 'Volume pricing available',
        features: ['SSO / SAML', 'Audit logs', 'SLA & uptime guarantee', 'Dedicated support'],
        cta: 'Contact us',
        href: '/signup',
        dark: false,
    },
];

function Pricing() {
    return (
        <section id="pricing" className="px-8 lg:px-12 py-28">
            <div className="max-w-[880px] mx-auto">
                <div className="mb-14">
                    <h2 className="text-[42px] md:text-[52px] font-bold tracking-[-2px] text-[#0A0A0A] leading-[1.05]">
                        Pricing
                    </h2>
                    <p className="text-[16px] text-[#6B6B6B] mt-3">
                        Free to start. No credit card required.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => (
                        <div key={plan.name}
                            className="flex flex-col p-7 rounded-[12px]"
                            style={{
                                background: plan.dark ? '#0A0A0A' : '#FAFAF9',
                                border: plan.dark ? '1px solid #222' : '1px solid #E8E8E3',
                            }}
                        >
                            <div className="mb-6">
                                <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] mb-3 ${plan.dark ? 'text-[#666]' : 'text-[#9B9B9B]'}`}>
                                    {plan.name}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-[36px] font-bold tracking-[-1.5px] leading-none ${plan.dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                                        {plan.price}
                                    </span>
                                </div>
                                <p className={`text-[13px] mt-1.5 ${plan.dark ? 'text-[#555]' : 'text-[#9B9B9B]'}`}>
                                    {plan.sub}
                                </p>
                            </div>

                            <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2.5">
                                        <div className="w-1 h-1 rounded-full shrink-0"
                                            style={{ background: plan.dark ? '#444' : '#C8C8C4' }}
                                        />
                                        <span className={`text-[13.5px] ${plan.dark ? 'text-[#888]' : 'text-[#6B6B6B]'}`}>
                                            {f}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link href={plan.href}
                                className={`block w-full py-2.5 text-center text-[13.5px] font-semibold rounded-[8px] transition-colors duration-150 ${
                                    plan.dark
                                        ? 'bg-white text-[#0A0A0A] hover:bg-[#F0F0F0]'
                                        : 'bg-[#0A0A0A] text-white hover:bg-[#222]'
                                }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
    return (
        <section className="px-8 lg:px-12 py-28">
            <div className="max-w-[880px] mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
                <div>
                    <h2 className="text-[42px] md:text-[52px] font-bold tracking-[-2px] text-[#0A0A0A] leading-[1.05] max-w-[480px]">
                        Build something<br />worth remembering.
                    </h2>
                    <p className="text-[15px] text-[#6B6B6B] mt-4 max-w-[380px] leading-[1.7]">
                        Free for small teams. No time limits, no feature paywalls to get started.
                    </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                    <Link href="/signup"
                        className="flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white bg-[#0A0A0A] rounded-[9px] hover:bg-[#222] transition-colors duration-150 whitespace-nowrap"
                    >
                        Get started free
                        <ArrowRight size={14} strokeWidth={2.2} />
                    </Link>
                    <Link href="/login"
                        className="text-[13.5px] text-center text-[#9B9B9B] hover:text-[#0A0A0A] transition-colors duration-150"
                    >
                        Already have an account →
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
    const cols: [string, string[]][] = [
        ['Product', ['Features', 'Pricing', 'Changelog', 'Roadmap']],
        ['Company', ['About', 'Blog', 'Careers', 'Press']],
        ['Resources', ['Docs', 'API', 'Status', 'Security']],
        ['Legal', ['Privacy', 'Terms', 'Cookies']],
    ];

    return (
        <footer className="px-8 lg:px-12 pt-14 pb-10">
            <div className="max-w-[880px] mx-auto">
                <div className="flex flex-col md:flex-row gap-12 mb-14">
                    <div className="shrink-0">
                        <Link href="/" className="flex items-center gap-2 mb-3">
                            <div className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] bg-[#FAFAF9] border border-[#E8E8E3] overflow-hidden shadow-sm shrink-0">
                                <Image src="/sporelighticon.png" alt="spore" width={22} height={22} className="object-contain" />
                            </div>
                            <span className="text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.4px]">spore</span>
                        </Link>
                        <p className="text-[12.5px] text-[#ADADAA] leading-relaxed max-w-[160px]">
                            Workspace for teams that think together.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                        {cols.map(([section, links]) => (
                            <div key={section}>
                                <p className="text-[11px] font-semibold text-[#0A0A0A] uppercase tracking-[0.08em] mb-3.5">{section}</p>
                                <ul className="flex flex-col gap-2">
                                    {links.map((l) => (
                                        <li key={l}>
                                            <a href="#" className="text-[13px] text-[#9B9B9B] hover:text-[#0A0A0A] transition-colors duration-150">
                                                {l}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-7">
                    <p className="text-[12px] text-[#C4C4C0]">
                        © {new Date().getFullYear()} spore, Inc.
                    </p>
                    <a href="#" className="flex items-center gap-1 text-[12px] text-[#C4C4C0] hover:text-[#9B9B9B] transition-colors duration-150">
                        System status
                        <ArrowUpRight size={11} />
                    </a>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white text-[#0A0A0A] font-sans antialiased">
            <Nav />
            <Hero />
            <FeatureRows />
            <Features />
            <Pricing />
            <CTA />
            <Footer />
        </div>
    );
}
