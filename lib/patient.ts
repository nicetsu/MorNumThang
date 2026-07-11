import { cookies } from "next/headers";
import { db } from "@/lib/db";

// ponytail: two cookies, no auth. `oid` = the owner id the user typed on the way in
// (the "login"); `pid` = which of that owner's ม้า is active. Swap to real sessions later.
export const OID_COOKIE = "oid";
export const PID_COOKIE = "pid";

// The owner id the user entered, or null if they haven't been through the gate yet.
export async function getOwnerId() {
  return (await cookies()).get(OID_COOKIE)?.value ?? null;
}

// The active ม้า — scoped to the owner so a stray pid cookie can't read someone else's data.
// null when no owner is set or the owner has no patients.
export async function getActivePatient() {
  const owner = await getOwnerId();
  if (!owner) return null;
  const id = (await cookies()).get(PID_COOKIE)?.value;
  if (id) {
    const p = await db.patient.findFirst({ where: { id, owner } });
    if (p) return p;
  }
  return db.patient.findFirst({ where: { owner } });
}

// For server actions that mutate — a missing patient here is a real error, not an empty page.
export async function getActivePatientOrThrow() {
  const p = await getActivePatient();
  if (!p) throw new Error("ยังไม่ได้เลือกม้า");
  return p;
}
