"use server";

import { revalidatePath } from "next/cache";
import { autoCheckMed, bangkokDateKey } from "@/lib/care-checks";
import { getActivePatientOrThrow } from "@/lib/patient";

export async function markMedTaken(formData: FormData) {
  const medId = String(formData.get("medId") ?? "");
  if (!medId) return;

  const patient = await getActivePatientOrThrow();
  await autoCheckMed(patient.id, medId, bangkokDateKey(new Date()));

  revalidatePath("/meds/list");
  revalidatePath("/calendar");
  revalidatePath("/");
}
