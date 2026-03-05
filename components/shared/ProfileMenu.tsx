'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings, User, Bell, Puzzle,
  LogOut, Moon, Sun, ChevronRight,
  Building2, CreditCard, Users, Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { useTheme } from '@/lib/context/themeContext';
import { useWorkspace } from '@/lib/context/workspaceContext';
import { signOut } from '@/lib/actions/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuSection {
  items: MenuItem[];
}

interface MenuItem {
  type:    'link' | 'action' | 'toggle' | 'divider';
  label?:  string;
  hint?:   string;
  icon?:   React.ComponentType<{ size?: number; className?: string }>;
  href?:   string;
  danger?: boolean;
  onAction?: () => void;
}

// ─── ProfileMenu ─────────────────────────────────────────────────────────────

export function ProfileMenu() {
  const { slug, user } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';
  const email       = user?.email ?? '';

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMouse = (e: MouseEvent) => {
      if (
        menuRef.current    && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [open]);

  // ⌘ + , opens settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        window.location.href = `/${slug}/settings`;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [slug]);

  const base = `/${slug}/settings`;

  return (
    <div className="relative">
      {/* Trigger — the avatar button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative rounded-full transition-all focus:outline-none',
          open && 'ring-2 ring-accent-blue ring-offset-1 ring-offset-bg-primary'
        )}
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar name={displayName} size={26} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-[260px] z-[200] bg-bg-elevated border border-border-default rounded-[10px] shadow-lg overflow-hidden"
          style={{ animation: 'sporePopoverIn 120ms ease-out' }}
          role="menu"
        >
          {/* Identity header */}
          <div className="px-4 py-3.5 border-b border-border-light flex items-center gap-3">
            <Avatar name={displayName} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-text-primary truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[12px] text-text-muted truncate mt-0.5">{email}</p>
            </div>
          </div>

          {/* Account section */}
          <div className="p-1.5">
            <p className="px-2 py-1 text-[10.5px] font-semibold text-text-muted uppercase tracking-wider select-none">
              Account
            </p>
            <MenuLink href={`${base}/profile`} icon={User} label="Profile" onClose={() => setOpen(false)} />
            <MenuLink href={`${base}/account`} icon={Settings} label="Account & security" onClose={() => setOpen(false)} />
            <MenuLink href={`${base}/notifications`} icon={Bell} label="Notifications" onClose={() => setOpen(false)} />
          </div>

          <div className="h-px bg-border-light mx-1.5" />

          {/* Workspace section */}
          <div className="p-1.5">
            <p className="px-2 py-1 text-[10.5px] font-semibold text-text-muted uppercase tracking-wider select-none">
              Workspace
            </p>
            <MenuLink href={`${base}/workspace`}     icon={Building2} label="General"       onClose={() => setOpen(false)} />
            <MenuLink href={`${base}/members`}       icon={Users}     label="Members"       onClose={() => setOpen(false)} />
            <MenuLink href={`${base}/integrations`}  icon={Puzzle}    label="Integrations"  onClose={() => setOpen(false)} />
            <MenuLink href={`${base}/billing`}       icon={CreditCard} label="Billing & plans" onClose={() => setOpen(false)} />
          </div>

          <div className="h-px bg-border-light mx-1.5" />

          {/* Preferences + sign out */}
          <div className="p-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-left"
            >
              <div className="w-[18px] flex items-center justify-center">
                {theme === 'light'
                  ? <Moon size={14} className="text-text-muted" />
                  : <Sun  size={14} className="text-text-muted" />}
              </div>
              <span className="flex-1">
                {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              </span>
            </button>

            {/* Keyboard shortcuts hint */}
            <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] text-text-muted select-none">
              <div className="w-[18px] flex items-center justify-center">
                <Keyboard size={14} />
              </div>
              <span className="flex-1">Settings</span>
              <kbd className="text-[11px] text-text-placeholder bg-bg-secondary border border-border-light rounded px-1.5 py-0.5 font-mono">
                ⌘ ,
              </kbd>
            </div>
          </div>

          <div className="h-px bg-border-light mx-1.5" />

          {/* Sign out */}
          <div className="p-1.5">
            <form action={signOut} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] text-[#E03E3E] hover:bg-[#E03E3E]/8 transition-colors text-left"
              >
                <div className="w-[18px] flex items-center justify-center">
                  <LogOut size={14} />
                </div>
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MenuLink ─────────────────────────────────────────────────────────────────

function MenuLink({
  href,
  icon: Icon,
  label,
  onClose,
}: {
  href:    string;
  icon:    React.ComponentType<{ size?: number; className?: string }>;
  label:   string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
    >
      <div className="w-[18px] flex items-center justify-center">
        <Icon size={14} className="text-text-muted" />
      </div>
      <span className="flex-1">{label}</span>
      <ChevronRight size={12} className="text-text-placeholder" />
    </Link>
  );
}
