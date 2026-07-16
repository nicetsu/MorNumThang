"use client";

import { useEffect, useRef, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

// Drives the LIFF handshake: init → (if already logged in) grab the id_token and hand it
// to the server → otherwise show a button that kicks off LINE login. On any failure (e.g.
// opened in a plain browser where LIFF can't init) it steps aside so the code form below still works.
type Liff = {
  login: (opts?: { redirectUri?: string }) => void;
  isLoggedIn: () => boolean;
  getIDToken: () => string | null;
};

export function LineLogin({ redirectTo = "/patients" }: { redirectTo?: string }) {
  // Rich-menu buttons deep-link as ?next=/logs etc. so every tap lands on the right page after login.
  // ponytail: same-origin path only — reject absolute URLs so ?next can't become an open redirect.
  function nextPath(fallback: string) {
    if (typeof window === "undefined") return fallback;
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback;
  }
  const liffRef = useRef<Liff | null>(null);
  const [status, setStatus] = useState<"init" | "ready" | "error">("init");
  const [msg, setMsg] = useState("");

  // Exchange the LIFF id_token for our session cookie, then hard-nav so it's sent.
  async function submitToken(liff: Liff) {
    const idToken = liff.getIDToken();
    // No id_token means the `openid` scope wasn't granted — profile alone can't prove identity.
    if (!idToken) throw new Error("ไม่ได้รับ id_token — ตรวจว่าเปิด OpenID Connect / scope openid");
    const r = await fetch("/api/auth/line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ idToken }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `login ล้มเหลว (${r.status})`);
    window.location.replace(nextPath(redirectTo)); // hard nav so the fresh cookie is sent
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!LIFF_ID) throw new Error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID");
        // Dynamic import keeps the window-dependent SDK out of SSR.
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });
        if (cancelled) return;
        liffRef.current = liff;
        // Just logged out? Show the button instead of auto-relogging in (which would
        // silently re-set the cookie and bounce the user straight back in).
        const justLoggedOut = new URLSearchParams(window.location.search).get("logout") === "1";
        if (!justLoggedOut && liff.isLoggedIn()) {
          await submitToken(liff);
          return;
        }
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMsg(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") {
    return (
      <p className="text-sm text-clay">
        เข้าสู่ระบบด้วย LINE ไม่ได้ ({msg}) — ใช้รหัสด้านล่างแทนได้ค่ะ
      </p>
    );
  }

  // If LINE is already logged in (e.g. right after app logout), log straight in.
  // Otherwise kick off the LINE OAuth redirect, returning to a clean URL (no ?logout=1).
  function onLogin() {
    const liff = liffRef.current;
    if (!liff) return;
    if (liff.isLoggedIn()) {
      submitToken(liff).catch((e) => {
        setStatus("error");
        setMsg(e instanceof Error ? e.message : String(e));
      });
    } else {
      // Keep ?next through the OAuth round-trip (but drop ?logout=1) so the deep link survives login.
      const n = nextPath("");
      const back = window.location.origin + window.location.pathname + (n ? `?next=${encodeURIComponent(n)}` : "");
      liff.login({ redirectUri: back });
    }
  }

  return (
    <button
      type="button"
      disabled={status !== "ready"}
      onClick={onLogin}
      className="btn-primary bg-[#06C755] disabled:opacity-60"
    >
      {status === "ready" ? "เข้าสู่ระบบด้วย LINE" : "กำลังเชื่อม LINE…"}
    </button>
  );
}
