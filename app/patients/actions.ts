"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PID_COOKIE, UID_COOKIE, ensureSelfPatient, getUserId } from "@/lib/patient";

async function setActive(id: string) {
  // ponytail: 1-year plain cookie — no auth to protect yet.
  (await cookies()).set(PID_COOKIE, id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}

export async function selectPatient(id: string) {
  await setActive(id);
  redirect("/");
}

export async function logout() {
  const c = await cookies();
  c.delete(PID_COOKIE);
  c.delete(UID_COOKIE);
  // ?logout=1 tells LineLogin NOT to auto-relogin via LIFF (LINE is still logged in),
  // otherwise the cookie is re-set instantly and logout appears to do nothing.
  redirect("/enter?logout=1");
}

export async function createPatient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("กรุณากรอกชื่อ");
  const ageRaw = parseInt(String(formData.get("age") ?? ""), 10);
  const age = Number.isFinite(ageRaw) && ageRaw >= 0 && ageRaw <= 130 ? ageRaw : null;

  const uid = (await getUserId())!; // middleware guarantees a logged-in ผู้ดูแล
  const p = await db.patient.create({ data: { name, age, caregivers: { connect: { id: uid } } } });
  await setActive(p.id);
  redirect("/");
}

// Open the user's own care record (โปรไฟล์ตัวเอง) as the active ผู้รับการดูแล.
export async function careForSelf() {
  const uid = (await getUserId())!;
  const p = await ensureSelfPatient(uid);
  await setActive(p.id);
  redirect("/");
}
