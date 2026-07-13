import { cookies } from "next/headers";
import { db } from "@/lib/db";

// ponytail: two cookies, no real auth yet. `uid` = the logged-in ผู้ดูแล (User.id) —
// set at /enter from a typed code, later from LINE login. `pid` = which of their
// ผู้รับการดูแล is active. Swap the /enter gate for real LINE sessions later; nothing else changes.
export const UID_COOKIE = "uid";
export const PID_COOKIE = "pid";

// The logged-in ผู้ดูแล's User.id, or null if they haven't been through the gate yet.
export async function getUserId() {
  return (await cookies()).get(UID_COOKIE)?.value ?? null;
}

// The active ผู้รับการดูแล — scoped to the caregiver so a stray pid cookie can't read
// someone else's data. null when not logged in or the caregiver has no ผู้รับการดูแล.
export async function getActivePatient() {
  const uid = await getUserId();
  if (!uid) return null;
  const mine = { caregivers: { some: { id: uid } } };
  const id = (await cookies()).get(PID_COOKIE)?.value;
  if (id) {
    const p = await db.patient.findFirst({ where: { id, ...mine } });
    if (p) return p;
  }
  return db.patient.findFirst({ where: mine });
}

// For server actions that mutate — a missing patient here is a real error, not an empty page.
export async function getActivePatientOrThrow() {
  const p = await getActivePatient();
  if (!p) throw new Error("ยังไม่ได้เลือกผู้รับการดูแล");
  return p;
}
