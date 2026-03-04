import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — runs on every request before the page renders.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session token when it's close to expiry (keeps users
 *     logged in across long sessions without an extra round-trip on page load).
 *  2. Redirect unauthenticated users away from protected workspace routes.
 *  3. Redirect authenticated users away from /login and /signup to their workspace.
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const { pathname } = request.nextUrl;
    const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isConfirmRoute = pathname === '/auth/confirm';

    // If auth routes or home, always allow through first so login/signup never break
    if (isAuthRoute || isConfirmRoute || pathname === '/') {
        // Still run auth to possibly redirect logged-in users from /login to workspace
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            return supabaseResponse;
        }
        try {
            const supabase = createServerClient(url, key, {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        );
                        supabaseResponse = NextResponse.next({ request });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    },
                },
            });
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return supabaseResponse;
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('slug')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
            const slug = (workspace as { slug?: string } | null)?.slug;
            if (slug) {
                const redirectResponse = NextResponse.redirect(new URL(`/${slug}`, request.url));
                supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, c));
                return redirectResponse;
            }
        } catch {
            // Supabase/network error: allow request through so login page still loads
        }
        return supabaseResponse;
    }

    // Protected routes: require auth
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }
    try {
        const supabase = createServerClient(url, key, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = '/login';
            return NextResponse.redirect(loginUrl);
        }
    } catch {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static  (static files)
         * - _next/image   (image optimization)
         * - favicon.ico   (favicon)
         * - api/         (API routes — they handle their own auth)
         * - *.png, *.svg, *.jpg, etc. (public folder images — must be served without auth)
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)',
    ],
};
