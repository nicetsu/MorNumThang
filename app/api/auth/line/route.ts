import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UID_COOKIE } from "@/lib/patient";

// Verify a LIFF id_token and set the session cookie. A route handler (not a server action)
// because Set-Cookie must reach the browser reliably — server actions called imperatively
// from useEffect don't always apply their cookies, which left login looping back to /enter.
export async function POST(req: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID" }, { status: 500 });

  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) return NextResponse.json({ error: "ไม่มี id_token" }, { status: 400 });

  const verify = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!verify.ok) return NextResponse.json({ error: `ยืนยันตัวตน LINE ไม่สำเร็จ (${verify.status})` }, { status: 401 });

  const p: { sub: string; name?: string } = await verify.json(); // sub = LINE userId
  const user = await db.user.upsert({
    where: { lineId: p.sub },
    update: p.name ? { name: p.name } : {},
    create: { lineId: p.sub, name: p.name ?? null },
  });

  // Swap the default (logged-out) rich menu for the member menu now that we know who they are.
  // ponytail: fire-and-forget — a failed link (e.g. user hasn't added the OA) must not block login.
  const memberMenu = process.env.LINE_RICHMENU_MEMBER;
  const oaToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (memberMenu && oaToken) {
    fetch(`https://api.line.me/v2/bot/user/${p.sub}/richmenu/${memberMenu}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${oaToken}`, "Content-Length": "0" },
    }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(UID_COOKIE, user.id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
