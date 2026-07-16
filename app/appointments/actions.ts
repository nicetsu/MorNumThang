"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { medNotifyMessage, notifyCaregivers } from "@/lib/line";
import { getActivePatientOrThrow } from "@/lib/patient";
import { isAllergic } from "@/lib/allergy";
import { organizeMedsReceived, type ReceivedMedItem } from "@/lib/ai";
import { bangkokDateKey } from "@/lib/care-checks";

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

function thaiDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
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
  revalidatePath("/calendar");
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
  const careAdvice = String(formData.get("careAdvice") ?? "").trim();
  const nextAppointmentDate = String(formData.get("nextAppointmentDate") ?? "").trim();
  const nextAppointmentTime = String(formData.get("nextAppointmentTime") ?? "").trim();
  // Carried over from the appointment this note is attached to, for the new follow-up row.
  const place = String(formData.get("place") ?? "").trim() || null;

  const nextAppointment = nextAppointmentDate
    ? `${thaiDateLabel(nextAppointmentDate)}${nextAppointmentTime ? ` ${nextAppointmentTime} น.` : ""}`
    : null;
  // Don't save an empty note.
  if (!symptom && !medsReceived && !nextAppointment && !careAdvice) return;

  const pid = await patientId();

  await db.visitNote.create({
    data: { patientId: pid, symptom, medsReceived, nextAppointment },
  });

  // เชื่อมกับปฏิทิน/หน้านัดหมอ — a real date creates a real appointment row.
  if (nextAppointmentDate) {
    const at = new Date(`${nextAppointmentDate}T${nextAppointmentTime || "00:00"}+07:00`);
    if (!Number.isNaN(at.getTime())) {
      const note = symptom ? `นัดติดตาม: ${symptom}` : "นัดติดตาม";
      await db.appointment.create({ data: { patientId: pid, at, note, place } });
      await notifyCaregivers(pid, apptMessage("หมอนำทาง · นัดติดตามใหม่", note, at, place));
      revalidatePath("/appointments");
      revalidatePath("/calendar");
    }
  }

  // เชื่อมกับคู่มือดูแล — append (never overwrite) the caregiver's own guide, tagged as
  // advice from this visit's doctor so it stays distinguishable from AI drafts or the
  // caregiver's own notes on /guide.
  if (careAdvice) {
    const patient = await db.patient.findUnique({ where: { id: pid }, select: { careGuide: true } });
    const tagged = `— คำแนะนำจากหมอ (${thaiDateLabel(bangkokDateKey(new Date()))}) —\n${careAdvice}`;
    const merged = patient?.careGuide ? `${patient.careGuide}\n\n${tagged}` : tagged;
    await db.patient.update({ where: { id: pid }, data: { careGuide: merged } });
    revalidatePath("/guide");
    revalidatePath("/profile");
  }

  revalidatePath("/appointments");
  redirect("/appointments");
}

// "ยาที่ได้รับมา" — AI organizes the free text into meds for review (not saved yet).
export async function organizeMedsReceivedAction(text: string): Promise<ReceivedMedItem[]> {
  const t = text.trim();
  if (!t) return [];
  return organizeMedsReceived(t);
}

// Persist the reviewed meds the caregiver confirmed — เชื่อมกับหน้า "ยาที่ต้องทาน".
export async function saveReceivedMeds(
  items: ReceivedMedItem[],
): Promise<{ error?: string; ok?: string }> {
  const clean = items
    .map((i) => ({
      name: i.name.trim(),
      dose: i.dose > 0 ? i.dose : 1,
      whenTime: i.whenTime || "ตามแพทย์สั่ง",
    }))
    .filter((i) => i.name);
  if (!clean.length) return { error: "ไม่มีรายการยาให้บันทึก" };

  const pid = await patientId();
  const allergies = (await db.allergy.findMany({ where: { patientId: pid } })).map((a) => a.name);

  // Deterministic safety gate — never trust the client, re-check server-side (AGENTS.md rule 2).
  const blocked = clean.filter((i) => isAllergic(i.name, allergies));
  const safe = clean.filter((i) => !isAllergic(i.name, allergies));
  if (!safe.length) {
    return { error: "ผู้รับการดูแลแพ้ยาทุกตัวในรายการนี้ — เพิ่มไม่ได้เพื่อความปลอดภัย" };
  }

  // Group by name so multiple time-slots of the same drug share perDay (matches addMedication).
  const byName = new Map<string, { whenTime: string; dose: number }[]>();
  for (const it of safe) {
    const list = byName.get(it.name) ?? [];
    list.push({ whenTime: it.whenTime, dose: it.dose });
    byName.set(it.name, list);
  }

  for (const [name, schedules] of byName) {
    for (const s of schedules) {
      await db.medication.create({
        data: { patientId: pid, name, dose: s.dose, perDay: schedules.length, whenTime: s.whenTime, remaining: null },
      });
    }
    await notifyCaregivers(pid, medNotifyMessage(name, schedules, null));
  }

  revalidatePath("/meds/list");
  revalidatePath("/meds/add");
  revalidatePath("/calendar");
  revalidatePath("/");

  const skippedNote = blocked.length ? ` (ข้าม ${blocked.map((b) => b.name).join(", ")} เพราะแพ้ยา)` : "";
  return { ok: `เพิ่ม ${byName.size} รายการยาแล้วค่ะ${skippedNote}` };
}
