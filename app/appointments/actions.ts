"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifyCaregivers } from "@/lib/line";
import { getActivePatientOrThrow } from "@/lib/patient";

async function patientId() {
  // ponytail: single-patient v1 (PLAN §6).
  const p = await getActivePatientOrThrow();
  return p.id;
}

function parseAt(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  // Trust boundary: need a valid date; time optional (defaults to 00:00).
  // Form values are wall-clock Bangkok time — pin +07:00 so a UTC server
  // (Vercel) doesn't treat "09:00" as 09:00 UTC / 16:00 in the todo list.
  const at = new Date(`${date}T${time || "00:00"}+07:00`);
  if (!date || Number.isNaN(at.getTime())) throw new Error("วันเวลานัดไม่ถูกต้อง");
  return at;
}

function fmtAt(at: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

function apptMessage(head: string, note: string | null, at: Date, place: string | null) {
  return [head, note ?? "นัดหมอ", fmtAt(at), place].filter(Boolean).join("\n");
}

export async function addAppointment(formData: FormData) {
  const note = String(formData.get("note") ?? "").trim() || null;
  const place = String(formData.get("place") ?? "").trim() || null;
  const at = parseAt(formData);
  const pid = await patientId();

  await db.appointment.create({
    data: { patientId: pid, at, note, place },
  });
  await notifyCaregivers(pid, apptMessage("หมอนำทาง · นัดใหม่", note, at, place));
  revalidatePath("/appointments");
  revalidatePath("/");
  redirect("/appointments");
}

export async function completeAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    const pid = await patientId();
    await db.appointment.updateMany({ where: { id, patientId: pid }, data: { done: true } });
  }
  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/");
}

// เลื่อนนัด — reschedule to a new date/time.
export async function rescheduleAppointment(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const at = parseAt(formData);
  const appt = await db.appointment.update({
    where: { id },
    data: { at },
    select: { patientId: true, note: true, place: true },
  });
  await notifyCaregivers(appt.patientId, apptMessage("หมอนำทาง · เลื่อนนัดแล้ว", appt.note, at, appt.place));
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
