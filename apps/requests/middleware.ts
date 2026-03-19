import { NextResponse, type NextRequest } from "next/server";

type Role = "worker" | "operator" | "supervisor";

// Hostname → forced role mapping
function getRoleFromHost(host: string): Role | null {
  const h = host.split(":")[0]; // strip port for localhost
  if (h.startsWith("operator.") || h.startsWith("operator-")) return "operator";
  if (h.startsWith("worker.") || h.startsWith("worker-")) return "worker";
  if (h.startsWith("supervisor.") || h.startsWith("supervisor-")) return "supervisor";
  return null; // generic host — show role picker
}

const ROLE_PATHS: Record<Role, string> = {
  worker: "/request",
  operator: "/operator",
  supervisor: "/supervisor",
};

const ALL_ROLE_PATHS = Object.values(ROLE_PATHS);

export function middleware(request: NextRequest) {
  const name = request.cookies.get("onsite-name")?.value;
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") ?? "";
  const hostRole = getRoleFromHost(host);

  // API routes and bundle pages pass through (bundles handle login inline)
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname.startsWith("/bundle/")) return NextResponse.next();

  // If hostname forces a role, enforce the correct route
  if (hostRole) {
    const correctPath = ROLE_PATHS[hostRole];

    // Block access to other role pages
    const isOnWrongRolePage = ALL_ROLE_PATHS.some(
      (p) => p !== correctPath && pathname.startsWith(p)
    );
    if (isOnWrongRolePage) {
      return NextResponse.redirect(new URL(correctPath, request.url));
    }

    // Not logged in → show login (stays on /)
    // Exception: /request/[lotId] and /operator/[siteId] handle login inline
    const isLotPageHosted = pathname.match(/^\/request\/[^/]+$/);
    const isSitePageHosted = pathname.match(/^\/operator\/[^/]+$/);
    if (pathname !== "/" && !name && !isLotPageHosted && !isSitePageHosted) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Logged in + on login page → go to role page
    if (pathname === "/" && name) {
      return NextResponse.redirect(new URL(correctPath, request.url));
    }

    return NextResponse.next();
  }

  // Generic host (localhost, custom domain) — original behavior
  const role = request.cookies.get("onsite-role")?.value;

  // /request/[lotId] and /operator/[siteId] handle login inline — skip redirect
  const isLotPage = pathname.match(/^\/request\/[^/]+$/);
  const isSitePage = pathname.match(/^\/operator\/[^/]+$/);

  const isProtected = ALL_ROLE_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !name && !isLotPage && !isSitePage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && name && role) {
    const target = ROLE_PATHS[role as Role] ?? "/request";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/request/:path*", "/operator/:path*", "/supervisor/:path*", "/bundle/:path*"],
};
