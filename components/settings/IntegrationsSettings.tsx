'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Calendar, Mail, Link, Video, MessageSquare,
  Check, ExternalLink, AlertCircle, RefreshCw, X,
  Sparkles, BrainCircuit, Zap, Cpu, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntegrationPublic, IntegrationProvider } from '@/lib/types/integration';
import { INTEGRATION_META } from '@/lib/types/integration';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Calendar, Mail, Link, Video, MessageSquare,
  Sparkles, BrainCircuit, Zap, Cpu,
};

type AIProvider = 'anthropic' | 'openai' | 'google_gemini' | 'groq';

interface Props {
  integrations:    IntegrationPublic[];
  workspaceId:     string;
  workspaceSlug:   string;
  onDisconnect:    (provider: IntegrationProvider) => Promise<{ error: string | null }>;
  onConnectCalCom: (apiKey: string) => Promise<{ error: string | null }>;
  onConnectAI:     (provider: AIProvider, apiKey: string) => Promise<{ error: string | null }>;
  onSync:          (provider: 'google_calendar' | 'microsoft_calendar') => Promise<{ synced: number; error: string | null }>;
}

type Category = 'all' | 'calendar' | 'email' | 'meetings' | 'productivity' | 'ai';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'calendar',     label: 'Calendar' },
  { id: 'email',        label: 'Email' },
  { id: 'meetings',     label: 'Meetings' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'ai',           label: 'AI Models' },
];

function CalComModal({
  onConnect,
  onClose,
}: {
  onConnect: (apiKey: string) => Promise<void>;
  onClose: () => void;
}) {
  const [apiKey,   setApiKey]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onConnect(apiKey.trim());
    } catch (err: any) {
      setError(err.message ?? 'Failed to connect');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="w-[420px] bg-bg-primary rounded-[12px] border border-border-default shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[#111827] flex items-center justify-center">
              <Link size={11} className="text-white" />
            </div>
            <span className="text-[14px] font-semibold text-text-primary">
              Connect Cal.com
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-placeholder hover:text-text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[13px] text-text-secondary mb-4">
            Enter your Cal.com API key to connect your booking page. You can find it in{' '}
            <a
              href="https://app.cal.com/settings/developer/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              Cal.com Settings → API Keys
            </a>.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="cal_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-[13.5px] font-mono bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
            />
            {error && (
              <p className="text-[12.5px] text-[#E03E3E] flex items-center gap-1.5">
                <AlertCircle size={12} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-[6px] text-[13.5px] font-medium text-text-secondary bg-bg-secondary border border-border-default hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="flex-1 py-2 rounded-[6px] text-[13.5px] font-medium text-white bg-[#111827] hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AIIntegrationCard({
  provider,
  connected,
  onConnect,
  onDisconnect,
}: {
  provider:    AIProvider;
  connected:   IntegrationPublic | undefined;
  onConnect:   (provider: AIProvider, apiKey: string) => Promise<void>;
  onDisconnect: (provider: IntegrationProvider) => Promise<void>;
}) {
  const meta        = INTEGRATION_META[provider];
  const Icon        = ICON_MAP[meta.icon] ?? Sparkles;
  const isConnected = !!connected;

  const [editing,      setEditing]      = useState(false);
  const [apiKey,       setApiKey]       = useState('');
  const [showKey,      setShowKey]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError(null);
    await onConnect(provider, apiKey.trim());
    setLoading(false);
    setEditing(false);
    setApiKey('');
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await onDisconnect(provider);
    setDisconnecting(false);
  };

  return (
    <div className="rounded-[10px] border border-border-default bg-bg-primary overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <div style={{ color: meta.color }}><Icon size={20} /></div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[14px] font-semibold text-text-primary">{meta.label}</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
                <Check size={9} strokeWidth={3} />
                Connected
              </span>
            )}
          </div>
          <p className="text-[13px] text-text-secondary">{meta.description}</p>
          {isConnected && !editing && (
            <p className="text-[12px] text-text-muted mt-1 font-mono">
              ••••••••••••••••••••••••
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              <button
                onClick={() => { setEditing((v) => !v); setError(null); setApiKey(''); }}
                className="px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-text-secondary border border-border-default hover:bg-bg-hover transition-colors"
              >
                {editing ? 'Cancel' : 'Update key'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-[#E03E3E] border border-[#E03E3E]/30 hover:bg-[#E03E3E]/8 transition-colors disabled:opacity-40"
              >
                {disconnecting ? 'Removing...' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditing(true); setError(null); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: meta.color }}
            >
              Connect
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Inline API key form */}
      {editing && (
        <div className="px-5 pb-5 pt-0 border-t border-border-light">
          <form onSubmit={handleSave} className="flex flex-col gap-3 pt-4">
            <div>
              <label className="block text-[12px] font-medium text-text-muted mb-1.5">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${meta.label} API key`}
                  autoFocus
                  className="w-full px-3 py-2 pr-9 text-[13.5px] font-mono bg-bg-secondary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-[12.5px] text-[#E03E3E] flex items-center gap-1.5">
                <AlertCircle size={12} /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setApiKey(''); setError(null); }}
                className="px-4 py-2 rounded-[6px] text-[13px] font-medium text-text-secondary bg-bg-secondary border border-border-default hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="px-4 py-2 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: meta.color }}
              >
                {loading ? 'Verifying...' : 'Save & verify'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  provider,
  connected,
  providerEmail,
  workspaceId,
  workspaceSlug,
  onDisconnect,
  onConnectCalCom,
  onSync,
}: {
  provider:       IntegrationProvider;
  connected:      IntegrationPublic | undefined;
  providerEmail?: string | null;
  workspaceId:    string;
  workspaceSlug:  string;
  onDisconnect:   (p: IntegrationProvider) => Promise<void>;
  onConnectCalCom: (apiKey: string) => Promise<void>;
  onSync?:        (p: 'google_calendar' | 'microsoft_calendar') => Promise<{ synced: number; error: string | null }>;
}) {
  const meta        = INTEGRATION_META[provider];
  const Icon        = ICON_MAP[meta.icon] ?? Calendar;
  const isConnected = !!connected;
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null);
  const [calComOpen,    setCalComOpen]    = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await onDisconnect(provider);
    setDisconnecting(false);
  };

  const handleSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    const result = await onSync(provider as 'google_calendar' | 'microsoft_calendar');
    setSyncing(false);
    if (result.error) {
      setSyncMsg(`Error: ${result.error}`);
    } else {
      setSyncMsg(`Synced ${result.synced} event${result.synced !== 1 ? 's' : ''}`);
    }
    setTimeout(() => setSyncMsg(null), 4000);
  };

  const handleConnect = () => {
    if (provider === 'cal_com') {
      setCalComOpen(true);
      return;
    }

    const oauthBase = provider.startsWith('google') ? 'google' : 'microsoft';
    const params = new URLSearchParams({
      provider,
      workspace_id:   workspaceId,
      workspace_slug: workspaceSlug,
      return_to:      `/${workspaceSlug}/settings/integrations`,
    });
    window.location.href = `/api/integrations/${oauthBase}/authorize?${params}`;
  };

  return (
    <>
      {calComOpen && (
        <CalComModal
          onConnect={async (key) => {
            await onConnectCalCom(key);
            setCalComOpen(false);
          }}
          onClose={() => setCalComOpen(false)}
        />
      )}

      <div className="flex items-start gap-4 p-5 rounded-[10px] border border-border-default bg-bg-primary hover:border-border-default transition-colors">
        {/* Provider icon */}
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <div style={{ color: meta.color }}><Icon size={20} /></div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[14px] font-semibold text-text-primary">{meta.label}</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
                <Check size={9} strokeWidth={3} />
                Connected
              </span>
            )}
          </div>
          <p className="text-[13px] text-text-secondary">{meta.description}</p>
          {isConnected && connected?.provider_email && (
            <p className="text-[12px] text-text-muted mt-1">
              {connected.provider_email}
            </p>
          )}
          {syncMsg && (
            <p className="text-[12px] text-accent-green mt-1 flex items-center gap-1">
              <Check size={11} /> {syncMsg}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              {onSync && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-text-secondary border border-border-default hover:bg-bg-hover transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync now'}
                </button>
              )}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-[#E03E3E] border border-[#E03E3E]/30 hover:bg-[#E03E3E]/8 transition-colors disabled:opacity-40"
              >
                {disconnecting ? 'Removing...' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: meta.color }}
            >
              Connect
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function IntegrationsSettings({
  integrations, workspaceId, workspaceSlug,
  onDisconnect, onConnectCalCom, onConnectAI, onSync,
}: Props) {
  const searchParams = useSearchParams();
  const [category,    setCategory]    = useState<Category>('all');
  const [toast,       setToast]       = useState<string | null>(null);

  // Handle OAuth return
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error     = searchParams.get('error');
    if (connected) {
      const label = INTEGRATION_META[connected as IntegrationProvider]?.label ?? connected;
      setToast(`✓ ${label} connected successfully`);
      setTimeout(() => setToast(null), 4000);
    } else if (error) {
      setToast(`⚠ Connection failed: ${error.replace(/_/g, ' ')}`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [searchParams]);

  const connectedMap = Object.fromEntries(
    integrations.map((i) => [i.provider, i])
  );

  const OAUTH_PROVIDERS: IntegrationProvider[] = [
    'google_calendar', 'google_gmail',
    'microsoft_calendar', 'microsoft_outlook',
    'cal_com', 'zoom', 'slack',
  ];

  const AI_PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'google_gemini', 'groq'];

  const showAISection  = category === 'all' || category === 'ai';
  const showOAuthSection = category !== 'ai';

  const filteredOAuth = OAUTH_PROVIDERS.filter((p) => {
    if (!showOAuthSection) return false;
    if (category === 'all') return true;
    return INTEGRATION_META[p].category === category;
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={cn(
          'mb-5 px-4 py-3 rounded-[8px] text-[13.5px] font-medium',
          toast.startsWith('✓')
            ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
            : 'bg-[#E03E3E]/10 text-[#E03E3E] border border-[#E03E3E]/20'
        )}>
          {toast}
        </div>
      )}

      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">Integrations</h2>
        <p className="text-[13.5px] text-text-secondary">
          Connect your favourite tools and AI models to supercharge your workflow.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors',
              category === cat.id
                ? 'bg-bg-active text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* OAuth integration cards */}
      {filteredOAuth.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {filteredOAuth.map((provider) => (
            <IntegrationCard
              key={provider}
              provider={provider}
              connected={connectedMap[provider]}
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              onDisconnect={async (p) => { await onDisconnect(p); }}
              onConnectCalCom={async (key) => { await onConnectCalCom(key); }}
              onSync={
                provider === 'google_calendar' || provider === 'microsoft_calendar'
                  ? onSync
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* AI model cards */}
      {showAISection && (
        <div>
          {category === 'all' && (
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                AI Models
              </p>
              <div className="flex-1 h-px bg-border-light" />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {AI_PROVIDERS.map((provider) => (
              <AIIntegrationCard
                key={provider}
                provider={provider}
                connected={connectedMap[provider]}
                onConnect={async (p, key) => { await onConnectAI(p, key); }}
                onDisconnect={async (p) => { await onDisconnect(p); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
