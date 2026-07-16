"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActivePatientOrThrow } from "@/lib/patient";

// Mark/unmark a calendar item ("med:<id>" | "task:<id>") done on a given day.
// Presence of a DailyCheck row = done; unchecking deletes it.
export async function toggleCheck(itemKey: string, date: string, done: boolean) {
  const p = await getActivePatientOrThrow();
  if (done) {
    await db.dailyCheck.upsert({
      where: { patientId_itemKey_date: { patientId: p.id, itemKey, date } },
      create: { patientId: p.id, itemKey, date },
      update: {},
    });
  } else {
    await db.dailyCheck.deleteMany({ where: { patientId: p.id, itemKey, date } });
  }
  revalidatePath("/calendar");
}

export async function addCareTask(category: string, title: string, time?: string | null) {
  const t = title.trim();
  if (!t) return;
  const p = await getActivePatientOrThrow();
  const max = await db.careTask.aggregate({
    where: { patientId: p.id, category },
    _max: { sortOrder: true },
  });
  await db.careTask.create({
    data: { patientId: p.id, category, title: t, time: time?.trim() || null, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/calendar");
}

export async function deleteCareTask(id: string) {
  const p = await getActivePatientOrThrow();
  // Scope the delete to the active patient so one caregiver can't delete another's task.
  await db.careTask.deleteMany({ where: { id, patientId: p.id } });
  revalidatePath("/calendar");
}

// Mark an appointment done/undone from the calendar (two-way, unlike completeAppointment).
export async function toggleAppointmentDone(id: string, done: boolean) {
  const p = await getActivePatientOrThrow();
  await db.appointment.updateMany({ where: { id, patientId: p.id }, data: { done } });
  revalidatePath("/calendar");
  revalidatePath("/appointments");
}
