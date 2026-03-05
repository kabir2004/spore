import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OAuthState, IntegrationProvider } from '@/lib/types/integration';

/**
 * GET /api/integrations/google/callback
 * Google redirects here after authorization.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');

  // Decode state
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

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI ??
    `${req.nextUrl.origin}/api/integrations/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=token_exchange_failed`, req.nextUrl.origin)
    );
  }

  // Fetch user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

  const provider: IntegrationProvider = state?.provider ?? 'google_calendar';

  // Store tokens in integrations table
  const { error: dbError } = await (supabase.from('integrations') as any)
    .upsert(
      {
        user_id:          user.id,
        workspace_id:     state?.workspace_id ?? null,
        provider,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token ?? null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        provider_email:   userInfo.email ?? null,
        provider_user_id: userInfo.id ?? null,
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
