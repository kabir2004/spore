'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, Settings, Building2, Users, Puzzle,
  Bell, CreditCard, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/context/workspaceContext';

const NAV_SECTIONS = [
  {
    label: 'Account',
    items: [
      { label: 'Profile',       href: 'profile',       icon: User       },
      { label: 'Account',       href: 'account',       icon: Settings   },
      { label: 'Notifications', href: 'notifications', icon: Bell       },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'General',      href: 'workspace',     icon: Building2  },
      { label: 'Members',      href: 'members',       icon: Users      },
      { label: 'Integrations', href: 'integrations',  icon: Puzzle     },
      { label: 'Billing',      href: 'billing',       icon: CreditCard },
    ],
  },
];

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { slug } = useWorkspace();
  const pathname  = usePathname();
  const base      = `/${slug}/settings`;

  const isActive = (href: string) => pathname.startsWith(`${base}/${href}`);

  return (
    <div className="min-h-full bg-bg-primary">
      {/* Page header */}
      <div className="border-b border-border-default sticky top-0 z-10 bg-bg-primary/95 backdrop-blur-sm">
        <div className="max-w-[1100px] mx-auto px-8 py-0 flex items-center h-[54px]">
          <Link
            href={`/${slug}`}
            className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-secondary transition-colors mr-6"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
          <span className="text-[15px] font-semibold text-text-primary">Settings</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 py-8 flex gap-10">
        {/* Left nav */}
        <aside className="w-[200px] shrink-0">
          <nav className="flex flex-col gap-5 sticky top-[70px]">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-2.5 mb-1">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={`${base}/${item.href}`}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] transition-colors',
                          active
                            ? 'bg-bg-active text-text-primary font-medium'
                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                        )}
                      >
                        <item.icon
                          size={15}
                          className={active ? 'text-text-secondary' : 'text-text-muted'}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-[680px]">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Shared primitives used across all settings sections ─────────────────────

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
        {description && (
          <p className="text-[13.5px] text-text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13.5px] font-medium text-text-primary">{label}</label>
      {description && (
        <p className="text-[12.5px] text-text-muted">{description}</p>
      )}
      {children}
    </div>
  );
}

export function SettingsInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-[13.5px] bg-bg-primary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

export function SettingsSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13.5px] bg-bg-primary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary transition-colors cursor-pointer appearance-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function SettingsSaveButton({
  loading,
  saved,
  onClick,
  disabled,
}: {
  loading: boolean;
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'px-4 py-2 rounded-[6px] text-[13.5px] font-medium transition-all',
        saved
          ? 'bg-accent-green text-white'
          : 'bg-accent-blue text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {loading ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
    </button>
  );
}

export function DangerZone({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="border border-[#E03E3E]/30 rounded-[8px] p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] font-medium text-text-primary">{title}</p>
        <p className="text-[13px] text-text-secondary mt-0.5">{description}</p>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium text-[#E03E3E] border border-[#E03E3E]/40 hover:bg-[#E03E3E]/8 transition-colors whitespace-nowrap"
      >
        {action}
      </button>
    </div>
  );
}
