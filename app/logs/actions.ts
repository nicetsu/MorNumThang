"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseWeight } from "./weight";

export async function addWeight(formData: FormData) {
  const kg = parseWeight(formData.get("kg"));

  const note = String(formData.get("note") ?? "").trim() || null;
  const dateStr = String(formData.get("date") ?? "");
  // input[type=date] gives YYYY-MM-DD; empty → now.
  const at = dateStr ? new Date(dateStr) : new Date();

  // ponytail: single-patient v1 — attach to the one patient (PLAN §6).
  const patient = await db.patient.findFirstOrThrow();
  await db.weightLog.create({ data: { patientId: patient.id, kg, note, at } });

  revalidatePath("/logs");
  revalidatePath("/");
}
