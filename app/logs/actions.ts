"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseWeight } from "./weight";
import { organizeNarrative, type OrganizedItem } from "@/lib/ai";

// Optional vital — parse to int in a sane range, else null (don't store garbage).
function optInt(v: FormDataEntryValue | null, min: number, max: number): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function addWeight(formData: FormData) {
  const kg = parseWeight(formData.get("kg"));
  const systolic = optInt(formData.get("systolic"), 40, 300);
  const diastolic = optInt(formData.get("diastolic"), 30, 200);
  const pulse = optInt(formData.get("pulse"), 20, 250);

  const note = String(formData.get("note") ?? "").trim() || null;
  const dateStr = String(formData.get("date") ?? "");
  // input[type=date] gives YYYY-MM-DD; empty → now.
  const at = dateStr ? new Date(dateStr) : new Date();

  // ponytail: single-patient v1 — attach to the one patient (PLAN §6).
  const patient = await db.patient.findFirstOrThrow();
  await db.weightLog.create({
    data: { patientId: patient.id, kg, systolic, diastolic, pulse, note, at },
  });

  revalidatePath("/logs");
  revalidatePath("/");
  revalidatePath("/profile");
}

// "เล่าอาการ" — AI organizes the caregiver's story into categories for review (not saved yet).
export async function organizeNarrativeAction(story: string): Promise<OrganizedItem[]> {
  const s = story.trim();
  if (!s) return [];
  return organizeNarrative(s);
}

// Persist the reviewed observations the caregiver confirmed (with AI severity).
export async function saveObservations(items: OrganizedItem[]) {
  const clean = items
    .map((i) => ({
      category: i.category.trim() || "อื่น ๆ",
      text: i.text.trim(),
      severity: typeof i.severity === "number" ? i.severity : 5,
    }))
    .filter((i) => i.text);
  if (!clean.length) return;
  const p = await db.patient.findFirstOrThrow();
  await db.observation.createMany({ data: clean.map((i) => ({ ...i, patientId: p.id })) });
  revalidatePath("/logs");
  revalidatePath("/");
  revalidatePath("/signals");
}
