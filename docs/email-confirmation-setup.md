# Email confirmation setup (aurora)

So users receive the confirmation email, it looks like your product, and clicking the link signs them in and opens the app.

---

## 1. Supabase Dashboard

### Redirect URL

1. Go to **Authentication → URL Configuration**:  
   https://supabase.com/dashboard/project/gfwdqbezpwtffvphriut/auth/url-configuration  
2. Set **Site URL** to your app (e.g. `http://localhost:3000` for dev or `https://yourdomain.com` for prod).  
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/confirm`
   - `https://yourdomain.com/auth/confirm` (when you have a production URL)

### Enable “Confirm email”

1. Go to **Authentication → Providers → Email**.  
2. Turn **ON** “Confirm email” so new signups must confirm before signing in.

### Why you might not get the email

- **Spam / Promotions** – Check spam and “Promotions” (Gmail).  
- **Rate limits** – Supabase’s built-in mail has limits; for production, use a custom SMTP (e.g. Resend, SendGrid) in **Project Settings → Auth → SMTP**.  
- **Wrong address** – Use the same email you sign up with.

---

## 2. Custom “Confirm signup” email template

Use this in **Authentication → Email Templates** for the **Confirm signup** template so the email looks like aurora.

### Subject

```
Confirm your aurora account
```

### Body (HTML)

Paste this into the **Confirm signup** template. It uses Supabase’s `{{ .ConfirmationURL }}` so the button link is correct.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
</head>
<body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f5; padding: 32px 16px;">
  <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e8e8e3; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #1a1a1a;">aurora</span>
    </div>
    <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1a1a1a;">
      Confirm your email
    </h1>
    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #6b6b6b;">
      You signed up for aurora. Click the button below to confirm <strong>{{ .Email }}</strong> and open your workspace.
    </p>
    <p style="margin: 0 0 28px; text-align: center;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #2383e2; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
        Confirm and open aurora
      </a>
    </p>
    <p style="margin: 0; font-size: 13px; color: #9b9b9b;">
      If you didn’t create an account, you can ignore this email.
    </p>
  </div>
  <p style="max-width: 440px; margin: 16px auto 0; font-size: 12px; color: #9b9b9b; text-align: center;">
    aurora — Your workspace for notes, docs, and tasks.
  </p>
</body>
</html>
```

After saving, new signups will get this email. Clicking **Confirm and open aurora** goes to Supabase to verify, then redirects to your app at `/auth/confirm` with the session; the app then creates their workspace (if needed) and sends them into the app.

---

## 3. Flow summary

1. User signs up → Supabase sends the custom “Confirm your aurora account” email (with `emailRedirectTo` set to `NEXT_PUBLIC_SITE_URL/auth/confirm`).  
2. User clicks the button → Supabase verifies the token and redirects to `/auth/confirm` with the session in the URL hash.  
3. `/auth/confirm` sets the session, calls `ensureWorkspaceForCurrentUser()` (creates workspace if first time), then redirects to `/{slug}`.  
4. User is in the app.

Ensure `NEXT_PUBLIC_SITE_URL` in `.env.local` matches the URL you use (e.g. `http://localhost:3000`). The redirect URL in Supabase must match exactly (including `/auth/confirm`).
