'server only';

import { createClient } from '@/lib/supabase/server';
import type { Integration, IntegrationPublic, IntegrationProvider } from '@/lib/types/integration';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getIntegrations(
  workspaceId?: string
): Promise<IntegrationPublic[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const query = (supabase.from('integrations') as any)
    .select('id, provider, provider_email, is_active, scopes, metadata, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (workspaceId) query.eq('workspace_id', workspaceId);

  const { data } = await query;
  return (data ?? []) as IntegrationPublic[];
}

export async function getIntegration(
  provider: IntegrationProvider
): Promise<Integration | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await (supabase.from('integrations') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .maybeSingle();

  return data as Integration | null;
}

// ─── Upsert / Disconnect ──────────────────────────────────────────────────────

export async function upsertIntegration(
  provider: IntegrationProvider,
  payload: Partial<Omit<Integration, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await (supabase.from('integrations') as any)
    .upsert(
      { user_id: user.id, provider, ...payload },
      { onConflict: 'user_id,provider' }
    );

  return { error: error?.message ?? null };
}

export async function disconnectIntegration(
  provider: IntegrationProvider
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await (supabase.from('integrations') as any)
    .update({ is_active: false, access_token: null, refresh_token: null })
    .eq('user_id', user.id)
    .eq('provider', provider);

  return { error: error?.message ?? null };
}

// ─── Token refresh (called server-side before API calls) ──────────────────────

export async function refreshGoogleToken(
  integration: Integration
): Promise<{ access_token: string; error: string | null }> {
  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  if (!integration.refresh_token) {
    return { access_token: '', error: 'No refresh token stored' };
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
    }),
  });

  const json = await res.json();
  if (!res.ok) return { access_token: '', error: json.error_description ?? 'Token refresh failed' };

  await upsertIntegration(integration.provider as IntegrationProvider, {
    access_token:    json.access_token,
    token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  });

  return { access_token: json.access_token as string, error: null };
}

export async function refreshMicrosoftToken(
  integration: Integration
): Promise<{ access_token: string; error: string | null }> {
  const clientId     = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

  if (!integration.refresh_token) {
    return { access_token: '', error: 'No refresh token stored' };
  }

  const res = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        scope:         'https://graph.microsoft.com/.default offline_access',
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) return { access_token: '', error: json.error_description ?? 'Token refresh failed' };

  await upsertIntegration(integration.provider as IntegrationProvider, {
    access_token:    json.access_token,
    refresh_token:   json.refresh_token ?? integration.refresh_token,
    token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  });

  return { access_token: json.access_token as string, error: null };
}

// ─── AI provider API key integration ─────────────────────────────────────────

type AIProvider = 'anthropic' | 'openai' | 'google_gemini' | 'groq';

async function validateAIKey(provider: AIProvider, apiKey: string): Promise<{ valid: boolean; label?: string }> {
  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      return { valid: res.ok };
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { valid: res.ok };
    }

    if (provider === 'google_gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return { valid: res.ok };
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { valid: res.ok };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function connectAIProvider(
  provider: AIProvider,
  apiKey: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  if (!apiKey.trim()) return { error: 'API key is required' };

  const { valid } = await validateAIKey(provider, apiKey.trim());
  if (!valid) return { error: 'Invalid API key — please double-check and try again' };

  return upsertIntegration(provider, {
    workspace_id: workspaceId,
    metadata:     { api_key: apiKey.trim() },
    is_active:    true,
  });
}

// ─── Cal.com API key integration ──────────────────────────────────────────────

export async function connectCalCom(
  apiKey: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  // Validate key by calling Cal.com API
  const res = await fetch('https://api.cal.com/v1/me', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return { error: 'Invalid Cal.com API key' };

  const user = await res.json();

  await upsertIntegration('cal_com', {
    workspace_id:    workspaceId,
    provider_email:  user.email ?? null,
    provider_user_id: String(user.id ?? ''),
    metadata: {
      api_key:     apiKey,
      username:    user.username ?? '',
      booking_url: `https://cal.com/${user.username}`,
    },
    is_active: true,
  });

  return { error: null };
}
