"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UID_COOKIE } from "@/lib/patient";

async function login(lineId: string, name?: string | null) {
  const user = await db.user.upsert({
    where: { lineId },
    update: name ? { name } : {},
    create: { lineId, name: name ?? null },
  });
  (await cookies()).set(UID_COOKIE, user.id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  redirect("/patients");
}

export async function enterId(formData: FormData) {
  // ponytail: freeform code fallback for testing outside the LINE app (localhost, plain Chrome).
  // The real login is loginWithLine below; both land on the same User via lineId.
  const code = String(formData.get("id") ?? "").trim().toLowerCase();
  if (!code) throw new Error("กรุณากรอกรหัสของคุณ");
  await login(code);
}

// Verify a LIFF id_token with LINE, then log the ผู้ดูแล in. The token proves identity
// server-side — LINE checks its signature/expiry and that `aud` matches our channel id.
export async function loginWithLine(idToken: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) throw new Error("ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID");
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!res.ok) throw new Error("ยืนยันตัวตน LINE ไม่สำเร็จ");
  const p: { sub: string; name?: string } = await res.json(); // sub = LINE userId
  await login(p.sub, p.name);
}
