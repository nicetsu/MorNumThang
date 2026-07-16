import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ponytail: same-origin path only — reject absolute URLs so ?next can't become an open redirect.
function safeNext(req: NextRequest): string | null {
  const n = req.nextUrl.searchParams.get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

// ponytail: the whole "auth" — no user cookie ⇒ you must enter a code first.
export function middleware(req: NextRequest) {
  const hasId = req.cookies.has("uid");
  const { pathname } = req.nextUrl;
  const next = safeNext(req);

  // /join/* is a public invite landing — it handles its own LINE login inline.
  if (!hasId && pathname !== "/enter" && !pathname.startsWith("/join")) {
    const enter = new URL("/enter", req.url);
    // Rich-menu ?next=/logs (and direct paths) must survive the login gate.
    const dest = next ?? `${pathname}${req.nextUrl.search}`;
    if (dest && dest !== "/") enter.searchParams.set("next", dest);
    return NextResponse.redirect(enter);
  }

  // Logged-in on /enter?next=/logs → honour the deep link (not always /).
  if (hasId && pathname === "/enter") {
    return NextResponse.redirect(new URL(next ?? "/", req.url));
  }

  // Logged-in LIFF endpoint /?next=/logs → bounce to the target page.
  if (hasId && next && pathname === "/") {
    return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.next();
}

// Skip Next internals, the AI api route, and static files (anything with a dot).
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
