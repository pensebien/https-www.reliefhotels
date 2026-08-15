import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  canonicalHostRedirectTarget,
  getPublicSiteOrigin,
} from "./lib/public-site";
import {
  isStaffPortalHost,
  isStaffPortalPath,
  STAFF_PORTAL_HEADER,
} from "./lib/staff-portal";

const intlMiddleware = createIntlMiddleware(routing);

function withStaffPortalHeader(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers);
  headers.set(STAFF_PORTAL_HEADER, "1");
  return new NextRequest(request.url, {
    headers,
    method: request.method,
  });
}

export default function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;
  const onStaffHost = isStaffPortalHost(host);
  const onStaffPath = isStaffPortalPath(pathname);
  const mainSiteUrl = getPublicSiteOrigin();

  // One-way host canonicalization (apex → www when APP_URL is www).
  // Prevents guest links from landing on a non-primary host.
  const canonicalHost = canonicalHostRedirectTarget(host);
  if (canonicalHost) {
    const target = new URL(pathname + request.nextUrl.search, mainSiteUrl);
    target.host = canonicalHost;
    return NextResponse.redirect(target, 308);
  }

  if (onStaffHost) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/en/staff";
      const headers = new Headers(request.headers);
      headers.set(STAFF_PORTAL_HEADER, "1");
      return NextResponse.rewrite(url, { request: { headers } });
    }

    if (
      pathname === "/demo" ||
      /^\/(en|fr|pcm|ig|yo)\/demo\/?$/.test(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/en/staff";
      return NextResponse.redirect(url);
    }

    if (!onStaffPath) {
      return NextResponse.redirect(
        new URL(pathname + request.nextUrl.search, mainSiteUrl),
      );
    }
  }

  if (onStaffHost || onStaffPath) {
    return intlMiddleware(withStaffPortalHeader(request));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
