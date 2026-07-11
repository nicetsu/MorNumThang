"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActivePatientOrThrow } from "@/lib/patient";

export async function saveCareGuide(formData: FormData) {
  const careGuide = String(formData.get("careGuide") ?? "").trim() || null;
  const p = await getActivePatientOrThrow();
  await db.patient.update({ where: { id: p.id }, data: { careGuide } });
  revalidatePath("/guide");
  revalidatePath("/profile");
}
