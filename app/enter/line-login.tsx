"use client";

import { useEffect, useRef, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

// Drives the LIFF handshake: init → (if already logged in) grab the id_token and hand it
// to the server → otherwise show a button that kicks off LINE login. On any failure (e.g.
// opened in a plain browser where LIFF can't init) it steps aside so the code form below still works.
export function LineLogin() {
  const liffRef = useRef<{ login: (opts?: { redirectUri?: string }) => void } | null>(null);
  const [status, setStatus] = useState<"init" | "ready" | "error">("init");
  const [msg, setMsg] = useState("");

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
        if (liff.isLoggedIn()) {
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
          if (!cancelled) window.location.replace("/patients"); // hard nav so the fresh cookie is sent
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

  return (
    <button
      type="button"
      disabled={status !== "ready"}
      onClick={() => liffRef.current?.login({ redirectUri: window.location.origin + "/enter" })}
      className="btn-primary bg-[#06C755] disabled:opacity-60"
    >
      {status === "ready" ? "เข้าสู่ระบบด้วย LINE" : "กำลังเชื่อม LINE…"}
    </button>
  );
}
