"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

async function patientId() {
  // ponytail: single-patient v1 (PLAN §6).
  const p = await db.patient.findFirstOrThrow();
  return p.id;
}

function parseAt(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  // Trust boundary: need a valid date; time optional (defaults to 00:00).
  const at = new Date(`${date}T${time || "00:00"}`);
  if (!date || Number.isNaN(at.getTime())) throw new Error("วันเวลานัดไม่ถูกต้อง");
  return at;
}

export async function addAppointment(formData: FormData) {
  const note = String(formData.get("note") ?? "").trim() || null;
  const place = String(formData.get("place") ?? "").trim() || null;
  const at = parseAt(formData);

  await db.appointment.create({
    data: { patientId: await patientId(), at, note, place },
  });
  revalidatePath("/appointments");
  revalidatePath("/");
  redirect("/appointments");
}

export async function completeAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await db.appointment.update({ where: { id }, data: { done: true } });
  revalidatePath("/appointments");
  revalidatePath("/");
}

// เลื่อนนัด — reschedule to a new date/time.
export async function rescheduleAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const at = parseAt(formData);
  await db.appointment.update({ where: { id }, data: { at } });
  revalidatePath("/appointments");
  revalidatePath("/");
}

export async function addVisitNote(formData: FormData) {
  const symptom = String(formData.get("symptom") ?? "").trim() || null;
  const medsReceived = String(formData.get("medsReceived") ?? "").trim() || null;
  const nextAppointment = String(formData.get("nextAppointment") ?? "").trim() || null;
  // Don't save an empty note.
  if (!symptom && !medsReceived && !nextAppointment) return;

  await db.visitNote.create({
    data: { patientId: await patientId(), symptom, medsReceived, nextAppointment },
  });
  revalidatePath("/appointments");
}
