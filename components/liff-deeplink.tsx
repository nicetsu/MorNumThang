"use client";

import { useEffect } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

// Rich-menu taps open https://liff.line.me/{id}?next=/logs — but LINE's primary
// redirect lands on the Endpoint URL as /?liff.state=… (the ?next is inside that blob).
// Only after liff.init() does LINE restore ?next=/logs (or /logs). Without init here,
// a logged-in user just stays on home because middleware never saw ?next=.
export function LiffDeepLink() {
  useEffect(() => {
    if (!LIFF_ID) return;
    if (!new URLSearchParams(window.location.search).has("liff.state")) return;

    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });
        if (cancelled) return;

        const url = new URL(window.location.href);
        const next = url.searchParams.get("next");
        // ponytail: same-origin path only — reject absolute URLs / open redirects.
        if (next && next.startsWith("/") && !next.startsWith("//")) {
          window.location.replace(next);
          return;
        }
        // Path-style deep link (liff.line.me/{id}/logs) — init may only replaceState,
        // so force a real navigation so Next serves the right page.
        if (url.pathname !== "/") {
          window.location.replace(url.pathname + url.search);
        }
      } catch {
        // Outside LINE / init failed — leave the user where they are.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
