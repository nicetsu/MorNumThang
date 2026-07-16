"use client";

import { useEffect, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

function hasLiffState() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("liff.state");
}

// Rich-menu LIFF URLs arrive as /?liff.state=… — init restores ?next=/logs, then we hard-nav.
// While that runs, show a blank "กำลังเปิด…" so home doesn't flash.
export function LiffDeepLink() {
  const [pending, setPending] = useState(hasLiffState);

  useEffect(() => {
    if (!LIFF_ID || !hasLiffState()) {
      setPending(false);
      return;
    }

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
        if (url.pathname !== "/") {
          window.location.replace(url.pathname + url.search);
          return;
        }
      } catch {
        // Outside LINE / init failed — show the page underneath.
      }
      if (!cancelled) setPending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ivory text-teal">
      <p className="font-bold">กำลังเปิด…</p>
    </div>
  );
}
