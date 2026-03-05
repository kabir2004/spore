'use client';

import React from 'react';
import { Check, Zap } from 'lucide-react';
import { SettingsSection } from '@/components/settings/SettingsShell';

const PLANS = [
  {
    id:    'free',
    label: 'Free',
    price: '$0',
    description: 'For individuals and small teams just getting started.',
    features: [
      '5 workspace members',
      '10 MB file uploads',
      '7-day page history',
      'Basic integrations',
    ],
    current: true,
  },
  {
    id:    'pro',
    label: 'Pro',
    price: '$12',
    description: 'For growing teams that need more power.',
    features: [
      'Unlimited members',
      '100 MB file uploads',
      'Unlimited page history',
      'All integrations (Google, Microsoft, Cal.com)',
      'Priority support',
      'Custom domains',
    ],
    current: false,
  },
  {
    id:    'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    description: 'For large organisations with advanced security needs.',
    features: [
      'Everything in Pro',
      'SSO / SAML',
      'Audit logs',
      'SLA guarantees',
      'Dedicated support',
      'Custom contracts',
    ],
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">Billing & Plans</h2>
        <p className="text-[13.5px] text-text-secondary">
          You are currently on the <strong>Free</strong> plan.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-[10px] border p-5 ${
              plan.current
                ? 'border-accent-blue bg-accent-blue/4'
                : 'border-border-default bg-bg-primary'
            }`}
          >
            {plan.current && (
              <span className="absolute top-3.5 right-3.5 text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Current
              </span>
            )}

            <p className="text-[15px] font-semibold text-text-primary mb-0.5">{plan.label}</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[28px] font-bold text-text-primary">{plan.price}</span>
              {plan.price !== 'Custom' && (
                <span className="text-[13px] text-text-muted">/ seat / month</span>
              )}
            </div>
            <p className="text-[12.5px] text-text-secondary mb-4">{plan.description}</p>

            <ul className="flex flex-col gap-1.5 mb-5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-text-secondary">
                  <Check size={13} className="text-accent-green mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled={plan.current}
              className={`w-full py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                plan.current
                  ? 'bg-bg-hover text-text-muted cursor-not-allowed'
                  : plan.id === 'enterprise'
                    ? 'bg-text-primary text-white hover:opacity-90'
                    : 'bg-accent-blue text-white hover:opacity-90'
              }`}
            >
              {plan.current ? 'Current plan' : plan.id === 'enterprise' ? 'Contact sales' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <SettingsSection title="Usage">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Members',          value: '2',       limit: '5' },
            { label: 'Storage used',     value: '1.2 MB',  limit: '10 MB' },
            { label: 'Page history',     value: '7 days',  limit: '7 days' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 p-4 rounded-[8px] border border-border-default"
            >
              <p className="text-[12px] text-text-muted font-medium uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-[22px] font-bold text-text-primary">{stat.value}</p>
              <p className="text-[12px] text-text-muted">of {stat.limit}</p>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
