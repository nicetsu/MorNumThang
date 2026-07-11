"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OID_COOKIE } from "@/lib/patient";

export async function enterId(formData: FormData) {
  // ponytail: freeform id (ชื่อ/เบอร์โทร) — the "who owns these profiles" key. No password yet.
  const id = String(formData.get("id") ?? "").trim().toLowerCase();
  if (!id) throw new Error("กรุณากรอกรหัสของคุณ");
  (await cookies()).set(OID_COOKIE, id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  redirect("/patients");
}
