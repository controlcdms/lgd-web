import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { defaultLocale, locales } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware({
  locales: Array.from(locales),
  defaultLocale,
  localePrefix: "always",
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Legacy support: redirect /dashboard* to the default locale.
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // First: locale detection/redirects.
  const intlRes = intlMiddleware(req);
  if (intlRes) return intlRes;

  // Auth for localized dashboard.
  const isDashboard = pathname.startsWith(`/${defaultLocale}/dashboard`) || locales.some((l) => pathname.startsWith(`/${l}/dashboard`));
  if (isDashboard) {
    const token = await getToken({ req });
    if (!token) {
      const url = req.nextUrl.clone();
      // next-auth default sign-in route
      url.pathname = "/api/auth/signin";
      url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

