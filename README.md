This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.  
If port 3000 is in use, Next.js will use **3001** — check the terminal for the actual URL.

**Sign in:** [http://localhost:3000/login](http://localhost:3000/login) (or replace `3000` with the port your dev server shows.)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deployed login: "Invalid email or password"

If sign-in works locally but fails on the deployed app (e.g. Vercel), check the following.

1. **Same Supabase project**  
   Your deployment must use the **same** Supabase project as the one where the user exists. In Vercel (or your host), set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   to the same values as your local `.env.local` (or to your production Supabase project if you use a separate one).

2. **Seed accounts (admin@spore.local, etc.)**  
   The demo accounts (`admin@spore.local` / `sporeAdmin1!`, etc.) only exist in the Supabase project you ran the seed against. To use them on the deployed app:
   - Either use the **same** project for deployment and run `npm run db:seed-accounts` once (with that project’s URL and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`),  
   - Or sign up a **new** user on the deployed app via the Sign up page.

3. **Email confirmation**  
   In [Supabase Dashboard → Authentication → Providers → Email](https://supabase.com/dashboard/project/_/auth/providers), if **“Confirm email”** is enabled, users must click the confirmation link before they can sign in. If they sign up and then sign in before confirming, Supabase may respond with “Invalid login credentials.” Have them check their inbox (and spam) for the confirmation email.

4. **Redirect URLs**  
   In Supabase → Authentication → URL Configuration, add your deployed URL (e.g. `https://your-app.vercel.app`) to **Redirect URLs** and set **Site URL** if needed so OAuth and email links point to the right domain.
