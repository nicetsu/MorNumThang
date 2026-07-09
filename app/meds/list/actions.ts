"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isAllergic } from "@/lib/allergy";

async function patientId() {
  // ponytail: single-patient v1 (PLAN §6).
  const p = await db.patient.findFirstOrThrow();
  return p.id;
}

export async function addAllergy(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const pid = await patientId();
  const existing = await db.allergy.findMany({ where: { patientId: pid } });
  // dedupe case-insensitively
  if (existing.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
  await db.allergy.create({ data: { patientId: pid, name } });
  revalidatePath("/meds/list");
}

export async function removeAllergy(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await db.allergy.delete({ where: { id } });
  revalidatePath("/meds/list");
}

export type MedState = { error?: string; ok?: string };

export async function addMedication(
  _prev: MedState,
  formData: FormData,
): Promise<MedState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "กรุณาเลือกยา" };

  const pid = await patientId();
  const allergies = await db.allergy.findMany({ where: { patientId: pid } });

  // Deterministic safety gate — never trust the client, re-check server-side.
  if (isAllergic(name, allergies.map((a) => a.name))) {
    return { error: `ม้าแพ้ “${name}” — เพิ่มยานี้ไม่ได้เพื่อความปลอดภัย` };
  }

  const schedule = String(formData.get("schedule") ?? "").trim() || null;
  await db.medication.create({ data: { patientId: pid, name, schedule } });
  revalidatePath("/meds/list");
  return { ok: `เพิ่ม ${name} แล้ว` };
}
