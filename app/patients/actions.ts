"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PID_COOKIE } from "@/lib/patient";

async function setActive(id: string) {
  // ponytail: 1-year plain cookie — no auth to protect yet.
  (await cookies()).set(PID_COOKIE, id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}

export async function selectPatient(id: string) {
  await setActive(id);
  redirect("/");
}

export async function createPatient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("กรุณากรอกชื่อ");
  const ageRaw = parseInt(String(formData.get("age") ?? ""), 10);
  const age = Number.isFinite(ageRaw) && ageRaw >= 0 && ageRaw <= 130 ? ageRaw : null;

  const p = await db.patient.create({ data: { name, age } });
  await setActive(p.id);
  redirect("/");
}
