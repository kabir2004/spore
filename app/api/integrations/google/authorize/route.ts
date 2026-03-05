import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OAuthState, IntegrationProvider } from '@/lib/types/integration';
import { INTEGRATION_META } from '@/lib/types/integration';

/**
 * GET /api/integrations/google/authorize
 * Query params:
 *   provider:       'google_calendar' | 'google_gmail'
 *   workspace_id:   UUID
 *   workspace_slug: string
 *   return_to:      path to redirect back to (e.g. /slug/settings/integrations)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const provider      = searchParams.get('provider') as IntegrationProvider | null;
  const workspaceId   = searchParams.get('workspace_id') ?? '';
  const workspaceSlug = searchParams.get('workspace_slug') ?? '';
  const returnTo      = searchParams.get('return_to') ?? `/${workspaceSlug}/settings/integrations`;

  if (!provider || !['google_calendar', 'google_gmail'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ??
    `${req.nextUrl.origin}/api/integrations/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID.' },
      { status: 503 }
    );
  }

  const scopes = INTEGRATION_META[provider].scopes.join(' ');

  const state: OAuthState = { workspace_id: workspaceId, workspace_slug: workspaceSlug, provider, return_to: returnTo };
  const stateParam = Buffer.from(JSON.stringify(state)).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id',     clientId);
  authUrl.searchParams.set('redirect_uri',  redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope',         `openid email profile ${scopes}`);
  authUrl.searchParams.set('access_type',   'offline');
  authUrl.searchParams.set('prompt',        'consent');
  authUrl.searchParams.set('state',         stateParam);

  return NextResponse.redirect(authUrl.toString());
}
