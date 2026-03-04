# Deployment (Vercel, etc.)

So that **login redirects to your app** on the deployed URL (and not to localhost), do the following.

## 1. Hosting environment variables

Set these in your hosting dashboard (e.g. Vercel → Project → Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – your Supabase anon key  
- **Optional:** `NEXT_PUBLIC_SITE_URL` – your app’s full URL (e.g. `https://your-app.vercel.app`).  
  If you omit it, the app will infer the base URL from the request (recommended for Vercel).

## 2. Supabase Auth URL configuration

In the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**:

1. **Site URL**  
   Set to your production URL, e.g. `https://your-app.vercel.app`  
   (no trailing slash).

2. **Redirect URLs**  
   Add your production callback and any other auth URLs, for example:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**`  
   (Supabase allows wildcards; add any other paths you use for auth if needed.)

Save the settings. Without this, Supabase may reject callbacks or redirect users to the wrong domain after login.

## 3. After deploying

Redeploy after changing env vars or Supabase URL settings. Then sign in on the **deployed** URL; you should be redirected into the app on that same domain.
