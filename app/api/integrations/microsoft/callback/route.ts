import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OAuthState, IntegrationProvider } from '@/lib/types/integration';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  const { searchParams } = req.nextUrl;
  const code       = searchParams.get('code');
  const error      = searchParams.get('error');
  const stateParam = searchParams.get('state');

  let state: OAuthState | null = null;
  try {
    if (stateParam) {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    }
  } catch { /* invalid state */ }

  const returnTo = state?.return_to ?? '/';

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=oauth_denied`, req.nextUrl.origin)
    );
  }

  const clientId     = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri  = process.env.MICROSOFT_REDIRECT_URI ??
    `${req.nextUrl.origin}/api/integrations/microsoft/callback`;

  const tokenRes = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
        scope:         'openid email profile offline_access https://graph.microsoft.com/.default',
      }),
    }
  );

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=token_exchange_failed`, req.nextUrl.origin)
    );
  }

  // Fetch profile from Microsoft Graph
  const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  const provider: IntegrationProvider = state?.provider ?? 'microsoft_calendar';

  const { error: dbError } = await (supabase.from('integrations') as any)
    .upsert(
      {
        user_id:          user.id,
        workspace_id:     state?.workspace_id ?? null,
        provider,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token ?? null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        provider_email:   profile.mail ?? profile.userPrincipalName ?? null,
        provider_user_id: profile.id ?? null,
        scopes:           tokens.scope ? tokens.scope.split(' ') : [],
        is_active:        true,
        metadata:         {},
      },
      { onConflict: 'user_id,provider' }
    );

  if (dbError) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=db_error`, req.nextUrl.origin)
    );
  }

  return NextResponse.redirect(
    new URL(`${returnTo}?connected=${provider}`, req.nextUrl.origin)
  );
}
