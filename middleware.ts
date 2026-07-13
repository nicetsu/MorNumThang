import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ponytail: the whole "auth" — no user cookie ⇒ you must enter a code first.
export function middleware(req: NextRequest) {
  const hasId = req.cookies.has("uid");
  const { pathname } = req.nextUrl;
  if (!hasId && pathname !== "/enter") {
    return NextResponse.redirect(new URL("/enter", req.url));
  }
  if (hasId && pathname === "/enter") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

// Skip Next internals, the AI api route, and static files (anything with a dot).
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
