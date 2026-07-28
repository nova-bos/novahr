import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route prefixes that require a signed-in session. Everything else
 * (marketing page, auth pages, terms/privacy, invite acceptance) is public.
 */
const PROTECTED_PREFIXES = [
  "/account",
  "/dashboard",
  "/employees",
  "/payroll",
  "/leave",
  "/reports",
  "/compliance",
  "/deductions",
  "/settings",
  "/tenants",
  "/billing",
];

const AUTH_PAGES = ["/login", "/signup"];

/**
 * Refreshes the Supabase auth session cookie on every request so server
 * components/actions always see a valid (non-expired) session, and enforces
 * route protection server-side: unauthenticated requests to app routes are
 * redirected to /login before any page code runs. `AuthGuard` remains as a
 * client-side complement for in-app session expiry.
 */
export async function middleware(request: NextRequest) {
  // Canonicalise to non-www. Keeps session cookies on one domain.
  if (request.nextUrl.hostname === "www.novabos.co.za") {
    const url = request.nextUrl.clone();
    url.hostname = "novabos.co.za";
    return NextResponse.redirect(url, { status: 301 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session if expired - required for Server Components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (AUTH_PAGES.some((page) => pathname === page) || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
