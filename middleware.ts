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

  // LIFF primary redirect arrives as /?liff.state=… — don't auth-bounce or strip it.
  // Client LiffDeepLink calls liff.init(), which restores ?next=/logs, then we handle it.
  if (req.nextUrl.searchParams.has("liff.state")) {
    return NextResponse.next();
  }

  // /join/* is a public invite landing — it handles its own LINE login inline.
  if (!hasId && pathname !== "/enter" && !pathname.startsWith("/join")) {
    const enter = new URL("/enter", req.url);
    // Rich-menu ?next=/logs (and direct paths) must survive the login gate.
    const dest = next ?? `${pathname}${req.nextUrl.search}`;
    if (dest && dest !== "/") enter.searchParams.set("next", dest);
    return NextResponse.redirect(enter);
  }

  // Logged-in rich-menu / LIFF deep link — honour ?next= on any entry path.
  if (hasId && next) {
    return NextResponse.redirect(new URL(next, req.url));
  }

  // Logged-in on /enter with no deep link → home.
  if (hasId && pathname === "/enter") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Skip Next internals, the AI api route, and static files (anything with a dot).
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
