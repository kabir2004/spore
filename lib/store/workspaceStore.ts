import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IBlock } from '../types/block';

// Fixed base timestamp — must never use Date.now() here because this module is
// evaluated independently on the server and the client, producing different values
// which makes any sort() over last_edited_time produce a different order on each
// side, causing React hydration mismatches.
const T = 1700000000000; // 2023-11-14T22:13:20.000Z — arbitrary fixed epoch

// ─── Mock Initial State ────────────────────────────────────────────────────────

const mockInitialState: Record<string, IBlock> = {
    // ── Workspace Root ────────────────────────────────────────────────────────
    'workspace-root': {
        id: 'workspace-root',
        type: 'page',
        properties: { title: 'Workspace Root' },
        content: ['page-1', 'page-2', 'page-3', 'page-4'],
        parent_id: null,
        created_time: T,
        last_edited_time: T,
    },

    // ── Page 1: Product Vision ────────────────────────────────────────────────
    'page-1': {
        id: 'page-1',
        type: 'page',
        properties: { title: 'Product Vision', icon: 'Telescope' },
        content: [
            'pv-intro', 'pv-h1-mission', 'pv-mission-text',
            'pv-h1-principles', 'pv-bullet-1', 'pv-bullet-2', 'pv-bullet-3', 'pv-bullet-4',
            'pv-h1-roadmap', 'pv-callout-ship',
            'pv-h2-q1', 'pv-todo-q1-1', 'pv-todo-q1-2', 'pv-todo-q1-3',
            'pv-h2-q2', 'pv-todo-q2-1', 'pv-todo-q2-2',
            'pv-h2-q3', 'pv-todo-q3-1', 'pv-todo-q3-2',
            'pv-divider', 'pv-quote',
        ],
        parent_id: 'workspace-root',
        created_time: T + 1000,
        last_edited_time: T + 1000,
    },
    'pv-intro': {
        id: 'pv-intro',
        type: 'text',
        properties: { text: 'Spore is built on a singular belief: software can be both powerful and beautiful. We are building the operating system for thought — a workspace that thinks alongside you.' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1100,
        last_edited_time: T + 1100,
    },
    'pv-h1-mission': {
        id: 'pv-h1-mission',
        type: 'h1',
        properties: { text: 'Mission' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1200,
        last_edited_time: T + 1200,
    },
    'pv-mission-text': {
        id: 'pv-mission-text',
        type: 'text',
        properties: { text: 'To give every professional team a workspace that captures ideas at the speed they occur, organizes them without friction, and surfaces them exactly when needed.' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1300,
        last_edited_time: T + 1300,
    },
    'pv-h1-principles': {
        id: 'pv-h1-principles',
        type: 'h1',
        properties: { text: 'Core Principles' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1400,
        last_edited_time: T + 1400,
    },
    'pv-bullet-1': {
        id: 'pv-bullet-1',
        type: 'bulleted_list_item',
        properties: { text: 'Design is function — every pixel earns its place' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1500,
        last_edited_time: T + 1500,
    },
    'pv-bullet-2': {
        id: 'pv-bullet-2',
        type: 'bulleted_list_item',
        properties: { text: 'Block-first architecture — everything is composable and queryable' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1600,
        last_edited_time: T + 1600,
    },
    'pv-bullet-3': {
        id: 'pv-bullet-3',
        type: 'bulleted_list_item',
        properties: { text: 'Speed as a feature — sub-100ms interactions everywhere' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1700,
        last_edited_time: T + 1700,
    },
    'pv-bullet-4': {
        id: 'pv-bullet-4',
        type: 'bulleted_list_item',
        properties: { text: 'Progressive disclosure — simple surface, infinite depth' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1800,
        last_edited_time: T + 1800,
    },
    'pv-h1-roadmap': {
        id: 'pv-h1-roadmap',
        type: 'h1',
        properties: { text: '2026 Roadmap' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 1900,
        last_edited_time: T + 1900,
    },
    'pv-callout-ship': {
        id: 'pv-callout-ship',
        type: 'callout',
        properties: { text: 'We ship every two weeks. Each release closes the gap between what teams need and what software provides.', calloutIcon: '🚀', calloutColor: 'blue' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2000,
        last_edited_time: T + 2000,
    },
    'pv-h2-q1': {
        id: 'pv-h2-q1',
        type: 'h2',
        properties: { text: 'Q1 — Foundation' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2100,
        last_edited_time: T + 2100,
    },
    'pv-todo-q1-1': {
        id: 'pv-todo-q1-1',
        type: 'to_do',
        properties: { text: 'Block editor v2 with inline formatting', checked: true },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2200,
        last_edited_time: T + 2200,
    },
    'pv-todo-q1-2': {
        id: 'pv-todo-q1-2',
        type: 'to_do',
        properties: { text: 'Calendar and meetings integration', checked: true },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2300,
        last_edited_time: T + 2300,
    },
    'pv-todo-q1-3': {
        id: 'pv-todo-q1-3',
        type: 'to_do',
        properties: { text: 'Inbox with email provider connect', checked: true },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2400,
        last_edited_time: T + 2400,
    },
    'pv-h2-q2': {
        id: 'pv-h2-q2',
        type: 'h2',
        properties: { text: 'Q2 — Intelligence' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2500,
        last_edited_time: T + 2500,
    },
    'pv-todo-q2-1': {
        id: 'pv-todo-q2-1',
        type: 'to_do',
        properties: { text: 'AI-powered document summarization', checked: false },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2600,
        last_edited_time: T + 2600,
    },
    'pv-todo-q2-2': {
        id: 'pv-todo-q2-2',
        type: 'to_do',
        properties: { text: 'Smart meeting notes extraction', checked: false },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2700,
        last_edited_time: T + 2700,
    },
    'pv-h2-q3': {
        id: 'pv-h2-q3',
        type: 'h2',
        properties: { text: 'Q3 — Scale' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2800,
        last_edited_time: T + 2800,
    },
    'pv-todo-q3-1': {
        id: 'pv-todo-q3-1',
        type: 'to_do',
        properties: { text: 'Team workspaces with role-based access', checked: false },
        content: [],
        parent_id: 'page-1',
        created_time: T + 2900,
        last_edited_time: T + 2900,
    },
    'pv-todo-q3-2': {
        id: 'pv-todo-q3-2',
        type: 'to_do',
        properties: { text: 'Real-time collaborative editing', checked: false },
        content: [],
        parent_id: 'page-1',
        created_time: T + 3000,
        last_edited_time: T + 3000,
    },
    'pv-divider': {
        id: 'pv-divider',
        type: 'divider',
        properties: {},
        content: [],
        parent_id: 'page-1',
        created_time: T + 3100,
        last_edited_time: T + 3100,
    },
    'pv-quote': {
        id: 'pv-quote',
        type: 'quote',
        properties: { text: 'The best interface is no interface. The second best is Spore.' },
        content: [],
        parent_id: 'page-1',
        created_time: T + 3200,
        last_edited_time: T + 3200,
    },

    // ── Page 2: Design System ─────────────────────────────────────────────────
    'page-2': {
        id: 'page-2',
        type: 'page',
        properties: { title: 'Design System', icon: 'Palette' },
        content: [
            'ds-intro',
            'ds-h1-foundations',
            'ds-h2-color', 'ds-color-text', 'ds-b-color-1', 'ds-b-color-2', 'ds-b-color-3', 'ds-b-color-4',
            'ds-h2-type', 'ds-type-text', 'ds-callout-type',
            'ds-h2-spacing', 'ds-b-spacing-1', 'ds-b-spacing-2', 'ds-b-spacing-3', 'ds-b-spacing-4',
            'ds-h1-components',
            'ds-h2-rules', 'ds-n-rule-1', 'ds-n-rule-2', 'ds-n-rule-3', 'ds-n-rule-4',
            'ds-h2-buttons', 'ds-code-buttons',
            'ds-divider',
            'ds-callout-live',
        ],
        parent_id: 'workspace-root',
        created_time: T + 5000,
        last_edited_time: T + 5000,
    },
    'ds-intro': {
        id: 'ds-intro',
        type: 'text',
        properties: { text: 'aurora\'s design system is the single source of truth for how we build consistent, accessible, and beautiful interfaces. Every decision is documented here.' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5100,
        last_edited_time: T + 5100,
    },
    'ds-h1-foundations': {
        id: 'ds-h1-foundations',
        type: 'h1',
        properties: { text: 'Foundations' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5200,
        last_edited_time: T + 5200,
    },
    'ds-h2-color': {
        id: 'ds-h2-color',
        type: 'h2',
        properties: { text: 'Color' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5210,
        last_edited_time: T + 5210,
    },
    'ds-color-text': {
        id: 'ds-color-text',
        type: 'text',
        properties: { text: 'Our palette is restrained by design. Nine semantic color roles, each with a purpose. Colors carry meaning — never decoration.' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5220,
        last_edited_time: T + 5220,
    },
    'ds-b-color-1': {
        id: 'ds-b-color-1',
        type: 'bulleted_list_item',
        properties: { text: 'bg-primary → canvas white #FFFFFF' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5230,
        last_edited_time: T + 5230,
    },
    'ds-b-color-2': {
        id: 'ds-b-color-2',
        type: 'bulleted_list_item',
        properties: { text: 'bg-secondary → off-white surface #F7F7F5' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5240,
        last_edited_time: T + 5240,
    },
    'ds-b-color-3': {
        id: 'ds-b-color-3',
        type: 'bulleted_list_item',
        properties: { text: 'accent-blue → primary action #2383E2' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5250,
        last_edited_time: T + 5250,
    },
    'ds-b-color-4': {
        id: 'ds-b-color-4',
        type: 'bulleted_list_item',
        properties: { text: 'accent-green → success and growth #0F7B6C' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5260,
        last_edited_time: T + 5260,
    },
    'ds-h2-type': {
        id: 'ds-h2-type',
        type: 'h2',
        properties: { text: 'Typography' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5270,
        last_edited_time: T + 5270,
    },
    'ds-type-text': {
        id: 'ds-type-text',
        type: 'text',
        properties: { text: 'Arimo for all UI text — a humanist sans-serif optimized for screen readability at 15px. JetBrains Mono for all code contexts.' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5280,
        last_edited_time: T + 5280,
    },
    'ds-callout-type': {
        id: 'ds-callout-type',
        type: 'callout',
        properties: { text: 'All type sizes are set in pixels, not rems, to ensure pixel-perfect rendering at every viewport size.', calloutIcon: '💡', calloutColor: 'blue' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5290,
        last_edited_time: T + 5290,
    },
    'ds-h2-spacing': {
        id: 'ds-h2-spacing',
        type: 'h2',
        properties: { text: 'Spacing & Radius' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5300,
        last_edited_time: T + 5300,
    },
    'ds-b-spacing-1': {
        id: 'ds-b-spacing-1',
        type: 'bulleted_list_item',
        properties: { text: 'Base unit: 4px grid — all spacing is a multiple of 4' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5310,
        last_edited_time: T + 5310,
    },
    'ds-b-spacing-2': {
        id: 'ds-b-spacing-2',
        type: 'bulleted_list_item',
        properties: { text: 'Radius SM 6px — inputs, tags, small buttons' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5320,
        last_edited_time: T + 5320,
    },
    'ds-b-spacing-3': {
        id: 'ds-b-spacing-3',
        type: 'bulleted_list_item',
        properties: { text: 'Radius MD 10px — cards, popovers, panels' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5330,
        last_edited_time: T + 5330,
    },
    'ds-b-spacing-4': {
        id: 'ds-b-spacing-4',
        type: 'bulleted_list_item',
        properties: { text: 'Radius LG 14px — modals, floating command menus' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5340,
        last_edited_time: T + 5340,
    },
    'ds-h1-components': {
        id: 'ds-h1-components',
        type: 'h1',
        properties: { text: 'Component Guidelines' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5400,
        last_edited_time: T + 5400,
    },
    'ds-h2-rules': {
        id: 'ds-h2-rules',
        type: 'h2',
        properties: { text: 'Usage Rules' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5410,
        last_edited_time: T + 5410,
    },
    'ds-n-rule-1': {
        id: 'ds-n-rule-1',
        type: 'numbered_list_item',
        properties: { text: 'Always use design tokens — never hardcode hex values' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5420,
        last_edited_time: T + 5420,
    },
    'ds-n-rule-2': {
        id: 'ds-n-rule-2',
        type: 'numbered_list_item',
        properties: { text: 'Hover states must be visually distinct from active states' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5430,
        last_edited_time: T + 5430,
    },
    'ds-n-rule-3': {
        id: 'ds-n-rule-3',
        type: 'numbered_list_item',
        properties: { text: 'Focus rings are required on all keyboard-interactive elements' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5440,
        last_edited_time: T + 5440,
    },
    'ds-n-rule-4': {
        id: 'ds-n-rule-4',
        type: 'numbered_list_item',
        properties: { text: 'Transitions must complete within 150ms (UI) or 200ms (layout)' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5450,
        last_edited_time: T + 5450,
    },
    'ds-h2-buttons': {
        id: 'ds-h2-buttons',
        type: 'h2',
        properties: { text: 'Button Variants' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5460,
        last_edited_time: T + 5460,
    },
    'ds-code-buttons': {
        id: 'ds-code-buttons',
        type: 'code',
        properties: {
            language: 'TypeScript',
            code: `// Primary action button
<button className="bg-accent-blue text-white px-4 py-2 rounded-[6px] hover:bg-accent-blue-hover transition-colors">
  Primary
</button>

// Secondary / ghost button
<button className="border border-border-default text-text-secondary px-4 py-2 rounded-[6px] hover:bg-bg-hover transition-colors">
  Secondary
</button>

// Destructive
<button className="bg-accent-red text-white px-4 py-2 rounded-[6px] hover:opacity-90 transition-opacity">
  Delete
</button>`,
        },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5470,
        last_edited_time: T + 5470,
    },
    'ds-divider': {
        id: 'ds-divider',
        type: 'divider',
        properties: {},
        content: [],
        parent_id: 'page-2',
        created_time: T + 5480,
        last_edited_time: T + 5480,
    },
    'ds-callout-live': {
        id: 'ds-callout-live',
        type: 'callout',
        properties: { text: 'This document is generated from source. If the system and this doc disagree, the system wins. File a discrepancy report.', calloutIcon: '⚠️', calloutColor: 'orange' },
        content: [],
        parent_id: 'page-2',
        created_time: T + 5490,
        last_edited_time: T + 5490,
    },

    // ── Page 3: Engineering ───────────────────────────────────────────────────
    'page-3': {
        id: 'page-3',
        type: 'page',
        properties: { title: 'Engineering', icon: 'Code' },
        content: [
            'eng-intro',
            'eng-h1-arch', 'eng-arch-text', 'eng-callout-invariant',
            'eng-h2-data', 'eng-b-data-1', 'eng-b-data-2', 'eng-b-data-3',
            'eng-h2-render', 'eng-b-render-1', 'eng-b-render-2', 'eng-b-render-3',
            'eng-h1-standards',
            'eng-n-std-1', 'eng-n-std-2', 'eng-n-std-3', 'eng-n-std-4',
            'eng-h1-newblock', 'eng-newblock-text',
            'eng-n-nb-1', 'eng-n-nb-2', 'eng-n-nb-3', 'eng-n-nb-4',
            'eng-code-example',
            'page-3-1',
        ],
        parent_id: 'workspace-root',
        created_time: T + 6000,
        last_edited_time: T + 6000,
    },
    'eng-intro': {
        id: 'eng-intro',
        type: 'text',
        properties: { text: 'Engineering at Spore means owning outcomes, not tickets. Every engineer understands the product deeply, ships independently, and holds the bar for their own work.' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6100,
        last_edited_time: T + 6100,
    },
    'eng-h1-arch': {
        id: 'eng-h1-arch',
        type: 'h1',
        properties: { text: 'Architecture' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6200,
        last_edited_time: T + 6200,
    },
    'eng-arch-text': {
        id: 'eng-arch-text',
        type: 'text',
        properties: { text: 'Spore is a block-based system at its core. Every piece of user content — a paragraph, a heading, a todo, a page — is an IBlock. This uniformity makes the editor composable and the data universally queryable.' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6300,
        last_edited_time: T + 6300,
    },
    'eng-callout-invariant': {
        id: 'eng-callout-invariant',
        type: 'callout',
        properties: { text: 'Key Invariant: A block\'s parent_id is the single source of truth for its location in the document tree. Never infer position from ordering.', calloutIcon: '🧱', calloutColor: 'purple' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6400,
        last_edited_time: T + 6400,
    },
    'eng-h2-data': {
        id: 'eng-h2-data',
        type: 'h2',
        properties: { text: 'Data Layer' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6500,
        last_edited_time: T + 6500,
    },
    'eng-b-data-1': {
        id: 'eng-b-data-1',
        type: 'bulleted_list_item',
        properties: { text: 'Zustand for client-side state — O(1) block lookups via Record<id, IBlock>' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6510,
        last_edited_time: T + 6510,
    },
    'eng-b-data-2': {
        id: 'eng-b-data-2',
        type: 'bulleted_list_item',
        properties: { text: 'All mutations go through addBlock / updateBlock / deleteBlock — no direct state writes' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6520,
        last_edited_time: T + 6520,
    },
    'eng-b-data-3': {
        id: 'eng-b-data-3',
        type: 'bulleted_list_item',
        properties: { text: 'Real-time sync via CRDT (planned Q3) — each block is its own CRDT unit' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6530,
        last_edited_time: T + 6530,
    },
    'eng-h2-render': {
        id: 'eng-h2-render',
        type: 'h2',
        properties: { text: 'Rendering' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6600,
        last_edited_time: T + 6600,
    },
    'eng-b-render-1': {
        id: 'eng-b-render-1',
        type: 'bulleted_list_item',
        properties: { text: 'BlockRenderer is the universal renderer — switch-dispatches on block.type' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6610,
        last_edited_time: T + 6610,
    },
    'eng-b-render-2': {
        id: 'eng-b-render-2',
        type: 'bulleted_list_item',
        properties: { text: 'Each block type is self-contained — no layout knowledge outside its case branch' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6620,
        last_edited_time: T + 6620,
    },
    'eng-b-render-3': {
        id: 'eng-b-render-3',
        type: 'bulleted_list_item',
        properties: { text: 'Drag-and-drop provided by hello-pangea DnD — draggable IDs are block IDs' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6630,
        last_edited_time: T + 6630,
    },
    'eng-h1-standards': {
        id: 'eng-h1-standards',
        type: 'h1',
        properties: { text: 'Coding Standards' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6700,
        last_edited_time: T + 6700,
    },
    'eng-n-std-1': {
        id: 'eng-n-std-1',
        type: 'numbered_list_item',
        properties: { text: 'One component per file — no barrel exports, no default+named mixing' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6710,
        last_edited_time: T + 6710,
    },
    'eng-n-std-2': {
        id: 'eng-n-std-2',
        type: 'numbered_list_item',
        properties: { text: 'Zustand selectors at the leaf — subscribe to the smallest slice needed' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6720,
        last_edited_time: T + 6720,
    },
    'eng-n-std-3': {
        id: 'eng-n-std-3',
        type: 'numbered_list_item',
        properties: { text: 'CSS custom properties for all colors — no Tailwind opacity hacks' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6730,
        last_edited_time: T + 6730,
    },
    'eng-n-std-4': {
        id: 'eng-n-std-4',
        type: 'numbered_list_item',
        properties: { text: 'TypeScript strict — no any, no @ts-ignore in production paths' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6740,
        last_edited_time: T + 6740,
    },
    'eng-h1-newblock': {
        id: 'eng-h1-newblock',
        type: 'h1',
        properties: { text: 'How to Add a New Block Type' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6800,
        last_edited_time: T + 6800,
    },
    'eng-newblock-text': {
        id: 'eng-newblock-text',
        type: 'text',
        properties: { text: 'Adding a new block type is a 4-step process that touches 3 files. Follow the sequence exactly.' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6810,
        last_edited_time: T + 6810,
    },
    'eng-n-nb-1': {
        id: 'eng-n-nb-1',
        type: 'numbered_list_item',
        properties: { text: 'Add the type literal to BlockType union in lib/types/block.ts' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6820,
        last_edited_time: T + 6820,
    },
    'eng-n-nb-2': {
        id: 'eng-n-nb-2',
        type: 'numbered_list_item',
        properties: { text: 'Add its case to the switch statement in BlockRenderer.tsx' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6830,
        last_edited_time: T + 6830,
    },
    'eng-n-nb-3': {
        id: 'eng-n-nb-3',
        type: 'numbered_list_item',
        properties: { text: 'Add the slash command entry in SlashCommandMenu.tsx' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6840,
        last_edited_time: T + 6840,
    },
    'eng-n-nb-4': {
        id: 'eng-n-nb-4',
        type: 'numbered_list_item',
        properties: { text: 'Add sample content to the mock store for testing' },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6850,
        last_edited_time: T + 6850,
    },
    'eng-code-example': {
        id: 'eng-code-example',
        type: 'code',
        properties: {
            language: 'TypeScript',
            code: `// lib/types/block.ts
export type BlockType =
  | 'page' | 'text' | 'h1' | 'h2' | 'h3'
  | 'bulleted_list_item' | 'numbered_list_item'
  | 'to_do' | 'toggle' | 'quote' | 'callout' | 'code'
  | 'image' | 'video' | 'audio' | 'file'
  | 'bookmark' | 'embed' | 'equation' | 'divider'
  | 'my_new_type'; // <-- add here

// components/editor/BlockRenderer.tsx
case 'my_new_type':
  return (
    <div className="group relative">
      <DragHandle dragHandleProps={dragHandleProps} />
      <MyNewTypeRenderer block={block} updateBlock={updateBlock} />
    </div>
  );`,
        },
        content: [],
        parent_id: 'page-3',
        created_time: T + 6860,
        last_edited_time: T + 6860,
    },
    'page-3-1': {
        id: 'page-3-1',
        type: 'page',
        properties: { title: 'Architecture Rules', icon: 'FileText' },
        content: ['text-3'],
        parent_id: 'page-3',
        created_time: T + 7000,
        last_edited_time: T + 7000,
    },
    'text-3': {
        id: 'text-3',
        type: 'text',
        properties: { text: 'Everything is a Block.' },
        content: [],
        parent_id: 'page-3-1',
        created_time: T + 7100,
        last_edited_time: T + 7100,
    },

    // ── Page 4: Q3 Planning ───────────────────────────────────────────────────
    'page-4': {
        id: 'page-4',
        type: 'page',
        properties: { title: 'Q3 Planning', icon: 'BarChart2' },
        content: [
            'q3-intro', 'q3-callout-okr',
            'q3-h1-objectives', 'q3-n-obj-1', 'q3-n-obj-2', 'q3-n-obj-3',
            'q3-h1-eng', 'todo-1', 'todo-2', 'q3-todo-3', 'q3-todo-4', 'q3-todo-5', 'q3-todo-6',
            'q3-h1-design', 'q3-todo-7', 'q3-todo-8', 'q3-todo-9',
            'q3-h1-milestones',
            'q3-b-mile-1', 'q3-b-mile-2', 'q3-b-mile-3', 'q3-b-mile-4', 'q3-b-mile-5',
            'q3-divider', 'q3-quote',
        ],
        parent_id: 'workspace-root',
        created_time: T + 9000,
        last_edited_time: T + 9000,
    },
    'q3-intro': {
        id: 'q3-intro',
        type: 'text',
        properties: { text: 'Q3 runs July 1 – September 30, 2026. Our north star: make aurora the undisputed best tool for async team collaboration.' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9100,
        last_edited_time: T + 9100,
    },
    'q3-callout-okr': {
        id: 'q3-callout-okr',
        type: 'callout',
        properties: { text: 'OKR: Reach 10,000 active workspaces by end of Q3 with NPS ≥ 60', calloutIcon: '🎯', calloutColor: 'blue' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9200,
        last_edited_time: T + 9200,
    },
    'q3-h1-objectives': {
        id: 'q3-h1-objectives',
        type: 'h1',
        properties: { text: 'Objectives' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9300,
        last_edited_time: T + 9300,
    },
    'q3-n-obj-1': {
        id: 'q3-n-obj-1',
        type: 'numbered_list_item',
        properties: { text: 'Ship collaborative real-time editing to all workspaces' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9310,
        last_edited_time: T + 9310,
    },
    'q3-n-obj-2': {
        id: 'q3-n-obj-2',
        type: 'numbered_list_item',
        properties: { text: 'Launch public API and integration marketplace' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9320,
        last_edited_time: T + 9320,
    },
    'q3-n-obj-3': {
        id: 'q3-n-obj-3',
        type: 'numbered_list_item',
        properties: { text: 'Grow to 10,000 active workspaces from 2,400 today' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9330,
        last_edited_time: T + 9330,
    },
    'q3-h1-eng': {
        id: 'q3-h1-eng',
        type: 'h1',
        properties: { text: 'Engineering Tasks' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 9400,
        last_edited_time: T + 9400,
    },
    'todo-1': {
        id: 'todo-1',
        type: 'to_do',
        properties: { text: 'Implement Block architecture', checked: true },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10000,
        last_edited_time: T + 10000,
    },
    'todo-2': {
        id: 'todo-2',
        type: 'to_do',
        properties: { text: 'Selection toolbar and inline formatting (bold, italic, underline)', checked: true },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10100,
        last_edited_time: T + 10100,
    },
    'q3-todo-3': {
        id: 'q3-todo-3',
        type: 'to_do',
        properties: { text: 'Build real-time syncing engine (CRDT)', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10200,
        last_edited_time: T + 10200,
    },
    'q3-todo-4': {
        id: 'q3-todo-4',
        type: 'to_do',
        properties: { text: 'Workspace creation and multi-workspace switching', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10300,
        last_edited_time: T + 10300,
    },
    'q3-todo-5': {
        id: 'q3-todo-5',
        type: 'to_do',
        properties: { text: 'Public API v1 — REST endpoints for blocks and pages', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10400,
        last_edited_time: T + 10400,
    },
    'q3-todo-6': {
        id: 'q3-todo-6',
        type: 'to_do',
        properties: { text: 'CRDT conflict resolution and offline-first sync', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10500,
        last_edited_time: T + 10500,
    },
    'q3-h1-design': {
        id: 'q3-h1-design',
        type: 'h1',
        properties: { text: 'Design Tasks' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10600,
        last_edited_time: T + 10600,
    },
    'q3-todo-7': {
        id: 'q3-todo-7',
        type: 'to_do',
        properties: { text: 'Mobile responsive editor', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10700,
        last_edited_time: T + 10700,
    },
    'q3-todo-8': {
        id: 'q3-todo-8',
        type: 'to_do',
        properties: { text: 'Dark mode system-wide', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10800,
        last_edited_time: T + 10800,
    },
    'q3-todo-9': {
        id: 'q3-todo-9',
        type: 'to_do',
        properties: { text: 'Cover images and page icon customization', checked: false },
        content: [],
        parent_id: 'page-4',
        created_time: T + 10900,
        last_edited_time: T + 10900,
    },
    'q3-h1-milestones': {
        id: 'q3-h1-milestones',
        type: 'h1',
        properties: { text: 'Milestones' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11000,
        last_edited_time: T + 11000,
    },
    'q3-b-mile-1': {
        id: 'q3-b-mile-1',
        type: 'bulleted_list_item',
        properties: { text: 'July 15 — Editor v2 GA with inline formatting' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11100,
        last_edited_time: T + 11100,
    },
    'q3-b-mile-2': {
        id: 'q3-b-mile-2',
        type: 'bulleted_list_item',
        properties: { text: 'August 1 — Real-time sync closed beta' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11200,
        last_edited_time: T + 11200,
    },
    'q3-b-mile-3': {
        id: 'q3-b-mile-3',
        type: 'bulleted_list_item',
        properties: { text: 'August 15 — Public API v1 launch' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11300,
        last_edited_time: T + 11300,
    },
    'q3-b-mile-4': {
        id: 'q3-b-mile-4',
        type: 'bulleted_list_item',
        properties: { text: 'September 1 — Integration marketplace goes live' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11400,
        last_edited_time: T + 11400,
    },
    'q3-b-mile-5': {
        id: 'q3-b-mile-5',
        type: 'bulleted_list_item',
        properties: { text: 'September 30 — Q3 retrospective and Q4 planning kickoff' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11500,
        last_edited_time: T + 11500,
    },
    'q3-divider': {
        id: 'q3-divider',
        type: 'divider',
        properties: {},
        content: [],
        parent_id: 'page-4',
        created_time: T + 11600,
        last_edited_time: T + 11600,
    },
    'q3-quote': {
        id: 'q3-quote',
        type: 'quote',
        properties: { text: 'Move fast, build things that matter.' },
        content: [],
        parent_id: 'page-4',
        created_time: T + 11700,
        last_edited_time: T + 11700,
    },
};

// ─── Workspace metadata ────────────────────────────────────────────────────────

interface WorkspaceMeta {
    name: string;
    rootId: string;
}

const mockWorkspaces: Record<string, WorkspaceMeta> = {
    kabir: { name: "Kabir's Workspace", rootId: 'workspace-root' },
};

// ─── Store interface ───────────────────────────────────────────────────────────

interface WorkspaceState {
    blocks: Record<string, IBlock>;
    workspaces: Record<string, WorkspaceMeta>;
    addBlock: (block: IBlock) => void;
    updateBlock: (id: string, updates: Partial<IBlock>) => void;
    deleteBlock: (id: string, parentId?: string) => void;
    getBlock: (id: string) => IBlock | undefined;
    getWorkspaceRootId: (slug: string) => string;
    createWorkspace: (slug: string, name: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function collectDescendantIds(blocks: Record<string, IBlock>, id: string): string[] {
    const block = blocks[id];
    if (!block) return [];
    const ids = [id];
    for (const childId of block.content ?? []) {
        ids.push(...collectDescendantIds(blocks, childId));
    }
    return ids;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const getStorage = () => {
    if (typeof window === 'undefined') {
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    }
    return localStorage;
};

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set, get) => ({
            blocks: mockInitialState,
            workspaces: mockWorkspaces,

            getBlock: (id) => get().blocks[id],

            getWorkspaceRootId: (slug) => get().workspaces[slug]?.rootId ?? 'workspace-root',

            addBlock: (block) => set((state) => ({
                blocks: { ...state.blocks, [block.id]: block }
            })),

            updateBlock: (id, updates) => set((state) => {
                const existing = state.blocks[id];
                if (!existing) return state;
                return {
                    blocks: {
                        ...state.blocks,
                        [id]: {
                            ...existing,
                            ...updates,
                            properties: { ...existing.properties, ...(updates.properties || {}) },
                            last_edited_time: Date.now(),
                        }
                    }
                };
            }),

            deleteBlock: (id, parentId) => set((state) => {
                const idsToRemove = collectDescendantIds(state.blocks, id);
                const newBlocks = { ...state.blocks };
                for (const bid of idsToRemove) {
                    delete newBlocks[bid];
                }
                if (parentId && newBlocks[parentId]) {
                    newBlocks[parentId] = {
                        ...newBlocks[parentId],
                        content: (newBlocks[parentId].content ?? []).filter((childId) => childId !== id),
                        last_edited_time: Date.now(),
                    };
                }
                return { blocks: newBlocks };
            }),

            createWorkspace: (slug, name) => set((state) => {
                const rootId = `ws-${slug}-root`;
                const rootBlock: IBlock = {
                    id: rootId,
                    type: 'page',
                    properties: { title: `${name}` },
                    content: [],
                    parent_id: null,
                    created_time: Date.now(),
                    last_edited_time: Date.now(),
                };
                return {
                    blocks: { ...state.blocks, [rootId]: rootBlock },
                    workspaces: {
                        ...state.workspaces,
                        [slug]: { name, rootId },
                    },
                };
            }),
        }),
        {
            name: 'spore-workspace',
            storage: createJSONStorage(getStorage),
            partialize: (s) => ({ blocks: s.blocks, workspaces: s.workspaces }),
            skipHydration: true,
        }
    )
);
