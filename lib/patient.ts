import { cookies } from "next/headers";
import { db } from "@/lib/db";

// ponytail: active patient = a cookie holding the chosen id. No auth yet — one caregiver,
// many ม้า. Swap to a session when auth is real (PLAN §6).
export const PID_COOKIE = "pid";

// The ม้า the app currently operates on: cookie choice, else the first patient (fallback).
// Returns null only when the DB has no patients at all.
export async function getActivePatient() {
  const id = (await cookies()).get(PID_COOKIE)?.value;
  if (id) {
    const p = await db.patient.findUnique({ where: { id } });
    if (p) return p;
  }
  return db.patient.findFirst();
}

// For server actions that mutate — a missing patient here is a real error, not an empty page.
export async function getActivePatientOrThrow() {
  const p = await getActivePatient();
  if (!p) throw new Error("ยังไม่ได้เลือกม้า");
  return p;
}
