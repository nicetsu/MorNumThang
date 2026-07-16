import { createTextStreamResponse, toTextStream } from "ai";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { recommendServices, facilityGuidance, rightsDirection } from "@/lib/rights";
import { inferSuspectedDiseases } from "@/lib/infer";
import { hasFreeMedRight, matchFreeMedSymptom, FREE_MED_FACILITY } from "@/lib/free-meds";
import { scoreLevel } from "@/lib/severity";
import {
  streamDoctorSummary,
  streamHealthSignals,
  streamCareSuggestions,
  streamRightsAdvice,
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
  if (!streamer && kind !== "rights") return new Response("bad kind", { status: 400 });

  const patient = await getActivePatient();
  if (!patient) return new Response("no patient", { status: 404 });

  const [allergies, meds, weights, visits, observations, ruleRows] = await Promise.all([
    db.allergy.findMany({ where: { patientId: patient.id } }),
    db.medication.findMany({ where: { patientId: patient.id } }),
    db.weightLog.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 5 }),
    db.visitNote.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 3 }),
    db.observation.findMany({ where: { patientId: patient.id }, orderBy: { at: "desc" }, take: 20 }),
    db.recommendationRule.findMany(),
  ]);

  const recorded = (patient.diseases ?? "").split(/[·,\n]+/).map((s) => s.trim()).filter(Boolean);
  // Infer suspected diseases from symptom text — deterministic, never a diagnosis (lib/infer.ts).
  const symptomTexts = [...observations.map((o) => o.text), ...visits.map((v) => v.symptom ?? "")];
  const inferred = inferSuspectedDiseases(symptomTexts);
  const suspectedNew = inferred.filter((d) => !recorded.some((r) => r.includes(d) || d.includes(r)));
  // For surfacing services, consider recorded + suspected diseases.
  const diseaseTokens = [...new Set([...recorded, ...inferred])];

  // Eligibility decided deterministically here (never by the LLM). The model only references it.
  // Base = recorded diseases only; expanded also considers suspected ones (for the summary).
  const facts = { coverage: patient.coverage, age: patient.age };
  const recs = recommendServices(ruleRows, { ...facts, diseases: patient.diseases });
  const recsExpanded = recommendServices(ruleRows, { ...facts, diseases: diseaseTokens.join(" · ") });

  const isDiseaseRule = (condition: string) => {
    if (diseaseTokens.some((d) => condition.includes(d))) return true;
    const m = condition.match(/ผู้ป่วย([฀-๿]+)/);
    return m ? diseaseTokens.some((d) => d.includes(m[1]) || m[1].includes(d)) : false;
  };

  const fmtRights = (rs: typeof recs) => {
    const seen = new Set<string>();
    return (
      rs
        .filter((r) => !seen.has(r.rule.serviceName) && seen.add(r.rule.serviceName))
        .slice(0, 8)
        .map(
          (r) =>
            `${r.rule.serviceName} (${r.rule.category}) — ${facilityGuidance(r.rule.facility, patient.hospital)}${r.match === "maybe" ? " [ควรตรวจสอบเพิ่ม]" : ""}`,
        )
        .join("; ") || null
    );
  };

  // สรุปให้หมอ → สิทธิของโรคที่เป็น + ที่อาจเป็น (จากอาการ); signals/care → บริการที่มีสิทธิทั้งหมด.
  const rights =
    kind === "summary"
      ? fmtRights(recsExpanded.filter((r) => isDiseaseRule(r.rule.condition)))
      : fmtRights(recs);

  // Inline สิทธิ suggestion — direction decided deterministically (rule 2), AI phrases it.
  if (kind === "rights") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentObs = observations.filter((o) => o.at >= weekAgo);
    const level = scoreLevel(recentObs.map((o) => o.severity));
    const symptomTexts = recentObs.filter((o) => o.category !== "เรื่องดี").map((o) => o.text);
    const freeMedSymptom = matchFreeMedSymptom(symptomTexts);
    const direction = rightsDirection(level, freeMedSymptom);
    if (!direction) return new Response("", { status: 200 }); // nothing to advise → empty
    return createTextStreamResponse({
      stream: toTextStream({
        stream: streamRightsAdvice({
          name: patient.name,
          coverage: patient.coverage,
          direction,
          freeMedAvailable: hasFreeMedRight(patient.coverage),
          freeMedFacility: FREE_MED_FACILITY,
          symptom: freeMedSymptom,
          recentSymptoms: symptomTexts,
          eligibleServices: rights,
        }).stream,
      }),
    });
  }

  const data: SummaryData = {
    name: patient.name,
    diseases: patient.diseases,
    allergies: allergies.map((a) => a.name),
    meds,
    weights,
    observations: observations.map((o) => ({ category: o.category, text: o.text, severity: o.severity ?? 5, at: o.at })),
    visits,
    coverage: patient.coverage,
    rights,
    suspected: kind === "summary" && suspectedNew.length ? suspectedNew.join(", ") : null,
  };

  return createTextStreamResponse({ stream: toTextStream({ stream: streamer(data).stream }) });
}
