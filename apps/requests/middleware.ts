import { NextResponse, type NextRequest } from "next/server";

// Hostname → forced role mapping
function getRoleFromHost(host: string): "worker" | "operator" | null {
  const h = host.split(":")[0]; // strip port for localhost
  if (h.startsWith("operator.") || h.startsWith("operator-")) return "operator";
  if (h.startsWith("worker.") || h.startsWith("worker-")) return "worker";
  return null; // generic host — show role picker
}

export function middleware(request: NextRequest) {
  const name = request.cookies.get("onsite-name")?.value;
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") ?? "";
  const hostRole = getRoleFromHost(host);

  // API routes pass through
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // If hostname forces a role, enforce the correct route
  if (hostRole) {
    const correctPath = hostRole === "operator" ? "/operator" : "/request";
    const wrongPath = hostRole === "operator" ? "/request" : "/operator";

    // Block access to the other role's page
    if (pathname.startsWith(wrongPath)) {
      return NextResponse.redirect(new URL(correctPath, request.url));
    }

    // Not logged in → show login (stays on /)
    if (pathname !== "/" && !name) {
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

  if ((pathname.startsWith("/request") || pathname.startsWith("/operator")) && !name) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && name && role) {
    const target = role === "operator" ? "/operator" : "/request";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/request/:path*", "/operator/:path*"],
};
