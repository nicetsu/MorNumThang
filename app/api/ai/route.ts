import { createTextStreamResponse, toTextStream } from "ai";
import { db } from "@/lib/db";
import {
  streamDoctorSummary,
  streamHealthSignals,
  streamCareSuggestions,
  type SummaryData,
} from "@/lib/ai";

const streamers = {
  summary: streamDoctorSummary,
  signals: streamHealthSignals,
  care: streamCareSuggestions,
};

// ponytail: single-patient v1 — one patient's data feeds every AI use (PLAN §6).
export async function POST(req: Request) {
  const { kind = "summary" } = await req.json().catch(() => ({}));
  const streamer = streamers[kind as keyof typeof streamers];
  if (!streamer) return new Response("bad kind", { status: 400 });

  const patient = await db.patient.findFirst();
  if (!patient) return new Response("no patient", { status: 404 });

  const [allergies, meds, weights, visits] = await Promise.all([
    db.allergy.findMany({ where: { patientId: patient.id } }),
    db.medication.findMany({ where: { patientId: patient.id } }),
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 5 }),
    db.visitNote.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 3 }),
  ]);

  const data: SummaryData = {
    name: patient.name,
    diseases: patient.diseases,
    allergies: allergies.map((a) => a.name),
    meds,
    weights,
    visits,
  };

  return createTextStreamResponse({ stream: toTextStream({ stream: streamer(data).stream }) });
}
