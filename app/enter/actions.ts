"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UID_COOKIE } from "@/lib/patient";

// Find-or-create the ผู้ดูแล and set the session cookie (used by the code-login form action).
// The real LINE login sets the cookie in /api/auth/line instead.
async function setUser(lineId: string, name?: string | null) {
  const user = await db.user.upsert({
    where: { lineId },
    update: name ? { name } : {},
    create: { lineId, name: name ?? null },
  });
  (await cookies()).set(UID_COOKIE, user.id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}

export async function enterId(formData: FormData) {
  // ponytail: freeform code fallback for testing outside the LINE app (localhost, plain Chrome).
  // The real LINE login goes through /api/auth/line; both land on the same User via lineId.
  const code = String(formData.get("id") ?? "").trim().toLowerCase();
  if (!code) throw new Error("กรุณากรอกรหัสของคุณ");
  await setUser(code);
  redirect("/patients");
}
