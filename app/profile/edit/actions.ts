"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActivePatientOrThrow } from "@/lib/patient";

export async function saveProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("กรุณากรอกชื่อ");

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const ageRaw = parseInt(String(formData.get("age") ?? ""), 10);
  const age = Number.isFinite(ageRaw) && ageRaw >= 0 && ageRaw <= 130 ? ageRaw : null;

  const p = await getActivePatientOrThrow();
  await db.patient.update({
    where: { id: p.id },
    data: {
      name,
      age,
      coverage: str("coverage"),
      hospital: str("hospital"),
      job: str("job"),
      diseases: str("diseases"),
      likes: str("likes"),
      caregiver: str("caregiver"),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile");
}
