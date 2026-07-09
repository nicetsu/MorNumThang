import { createTextStreamResponse, toTextStream } from "ai";
import { db } from "@/lib/db";
import { recommendServices, facilityGuidance } from "@/lib/rights";
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

  const [allergies, meds, weights, visits, ruleRows] = await Promise.all([
    db.allergy.findMany({ where: { patientId: patient.id } }),
    db.medication.findMany({ where: { patientId: patient.id } }),
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 5 }),
    db.visitNote.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 3 }),
    db.recommendationRule.findMany(),
  ]);

  // Eligibility decided deterministically here (never by the LLM). The model only references it.
  const recs = recommendServices(ruleRows, {
    coverage: patient.coverage,
    age: patient.age,
    diseases: patient.diseases,
  });
  const seen = new Set<string>();
  const rights =
    recs
      .filter((r) => !seen.has(r.rule.serviceName) && seen.add(r.rule.serviceName))
      .slice(0, 8)
      .map(
        (r) =>
          `${r.rule.serviceName} (${r.rule.category}) — ${facilityGuidance(r.rule.facility, patient.hospital)}${r.match === "maybe" ? " [ควรตรวจสอบเพิ่ม]" : ""}`,
      )
      .join("; ") || null;

  const data: SummaryData = {
    name: patient.name,
    diseases: patient.diseases,
    allergies: allergies.map((a) => a.name),
    meds,
    weights,
    visits,
    coverage: patient.coverage,
    rights,
  };

  return createTextStreamResponse({ stream: toTextStream({ stream: streamer(data).stream }) });
}
