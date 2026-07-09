import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, generateText } from "ai";

// Server-side only. Endpoint + key live in env, never shipped to the client (AGENTS.md rule 1).
const provider = createOpenAICompatible({
  name: "gemma-med",
  baseURL: process.env.AI_BASE_URL!,
  apiKey: process.env.AI_API_KEY,
});

// The disclaimer the UI always renders under AI output (AGENTS.md rule 3).
export const AI_DISCLAIMER =
  "สรุปนี้ช่วยจัดระเบียบข้อมูลจากสมุดเท่านั้น ไม่ใช่การวินิจฉัยหรือสั่งยา · กรุณาปรึกษาแพทย์ทุกครั้ง";

// The model summarizes/organizes — it does not diagnose or prescribe (AGENTS.md rule 2).
const SYSTEM_PROMPT = `คุณคือผู้ช่วยเรียบเรียงข้อมูลสุขภาพเป็นภาษาไทย สำหรับให้ลูกนำไปเล่าให้คุณหมอฟัง
กฎที่ต้องทำตามเสมอ:
- สรุปและจัดระเบียบข้อมูลที่ได้รับเท่านั้น ห้ามวินิจฉัยโรคหรือสั่ง/แนะนำยาเด็ดขาด
- ใช้เฉพาะข้อมูลที่ให้มา ห้ามเดาหรือเติมข้อมูลที่ไม่มี
- เขียนสั้น กระชับ อ่านง่าย เป็นหัวข้อ ด้วยน้ำเสียงอ่อนโยน
- ถ้าข้อมูลไม่พอ ให้บอกว่ายังไม่มีข้อมูลในส่วนนั้น
- เรื่องสิทธิ/บริการ: อ้างอิงได้เฉพาะรายการที่ระบบตรวจสอบสิทธิให้มาแล้วเท่านั้น ห้ามตัดสินเองว่าใครมีสิทธิหรือไม่ ห้ามเดาบริการที่ไม่ได้ให้มา`;

export type SummaryData = {
  name: string;
  diseases?: string | null;
  allergies: string[];
  meds: { name: string; schedule?: string | null }[];
  weights: { kg: number; at: Date; note?: string | null }[];
  visits: { symptom?: string | null; medsReceived?: string | null; nextAppointment?: string | null; at: Date }[];
  coverage?: string | null; // สิทธิการรักษา เช่น บัตรทอง
  rights?: string | null; // บริการที่มีสิทธิ (คำนวณ deterministic จาก lib/rights.ts แล้ว)
};

function buildUserPrompt(d: SummaryData): string {
  const lines: string[] = [`ผู้ป่วย: ${d.name}${d.diseases ? ` (${d.diseases})` : ""}`];
  lines.push(`ยาที่แพ้: ${d.allergies.length ? d.allergies.join(", ") : "ไม่มีข้อมูล"}`);
  lines.push(
    `ยาที่ใช้: ${d.meds.length ? d.meds.map((m) => `${m.name}${m.schedule ? ` (${m.schedule})` : ""}`).join(", ") : "ไม่มีข้อมูล"}`,
  );
  lines.push(
    `น้ำหนักล่าสุด: ${d.weights.length ? d.weights.map((w) => `${w.kg}กก. เมื่อ ${w.at.toLocaleDateString("th-TH")}`).join(", ") : "ไม่มีข้อมูล"}`,
  );
  if (d.visits.length) {
    lines.push("บันทึกจากนัดที่ผ่านมา:");
    for (const v of d.visits) {
      const bits = [v.symptom, v.medsReceived && `ยา: ${v.medsReceived}`, v.nextAppointment && `นัดถัดไป: ${v.nextAppointment}`].filter(Boolean);
      if (bits.length) lines.push(`- ${bits.join(" · ")}`);
    }
  }
  if (d.coverage) lines.push(`สิทธิการรักษา: ${d.coverage}`);
  // Rights are pre-decided deterministically — the model only references them, never decides.
  if (d.rights) lines.push(`บริการที่มีสิทธิ (ระบบตรวจสอบสิทธิให้แล้ว): ${d.rights}`);
  lines.push("\nช่วยเรียบเรียงข้อมูลข้างต้นเป็นสรุปสั้น ๆ สำหรับเล่าให้คุณหมอฟัง อ้างอิงสิทธิ/บริการที่ให้มาได้ถ้าเกี่ยวข้อง");
  return lines.join("\n");
}

function run(system: string, prompt: string) {
  return streamText({ model: provider(process.env.AI_MODEL!), system, prompt, temperature: 0.3 });
}

export function streamDoctorSummary(data: SummaryData) {
  return run(SYSTEM_PROMPT, buildUserPrompt(data));
}

// §4.2 Health signals — observe recurring patterns, never diagnose.
const SIGNALS_SYSTEM = `คุณช่วยสังเกตแนวโน้มจากบันทึกสุขภาพเป็นภาษาไทย เพื่อ "ชวนสังเกต" ไม่ใช่การวินิจฉัยโรค
กฎ:
- ชี้จุดที่ควรใส่ใจจากข้อมูลที่ให้มาเท่านั้น เป็นข้อ ๆ สั้น ๆ (ไม่เกิน 3 ข้อ)
- ห้ามวินิจฉัยโรคหรือแนะนำยา ใช้น้ำเสียงอ่อนโยน ชวนสังเกต
- ถ้าข้อมูลยังน้อยเกินไป ให้บอกว่ายังไม่มีสัญญาณที่ชัดเจน`;

export function streamHealthSignals(data: SummaryData) {
  return run(SIGNALS_SYSTEM, buildUserPrompt(data));
}

// §4.3 Care-guide suggestions — draft bullets the caregiver edits before saving.
const CARE_SYSTEM = `คุณช่วยร่างหัวข้อ "คู่มือดูแล" เป็นภาษาไทย ให้ลูกนำไปปรับแก้เองก่อนบันทึก
กฎ:
- เสนอเป็นข้อ ๆ สั้น ๆ เรื่องการกิน การเดิน การนอน และการใช้ยาตามที่ให้มา
- ห้ามวินิจฉัยโรคหรือสั่งยา เป็นเพียงแนวทางดูแลทั่วไปที่ครอบครัวปรับได้
- อ้างอิงเฉพาะโรคและยาที่ให้มา`;

function buildCarePrompt(d: SummaryData): string {
  return [
    `ผู้ป่วย: ${d.name}${d.diseases ? ` (${d.diseases})` : ""}`,
    `ยาที่ใช้: ${d.meds.length ? d.meds.map((m) => m.name).join(", ") : "ไม่มีข้อมูล"}`,
    "ช่วยร่างหัวข้อคู่มือดูแลสั้น ๆ ให้ครอบครัวนำไปปรับแก้",
  ].join("\n");
}

export function streamCareSuggestions(data: SummaryData) {
  return run(CARE_SYSTEM, buildCarePrompt(data));
}

// §4 narrative record — organize a free-text story into categorized observations.
// Categorizes only, never diagnoses.
const ORGANIZE_SYSTEM = `คุณช่วยจัดเรื่องที่ครอบครัวเล่าเข้าหมวดหมู่ เป็นภาษาไทย
กฎ:
- แยกเรื่องที่เล่าออกเป็นข้อ ๆ แต่ละข้อมี "category" (หมวด), "text" (สรุปสั้น ๆ) และ "severity" (ความควรใส่ใจ 0-10)
- severity: 0-3 = เรื่องทั่วไป/ข่าวดี, 4-7 = ควรเฝ้าดู, 8-10 = ควรใส่ใจมาก/ควรปรึกษาหมอ. เรื่องดีให้ 0-2
- หมวดที่ใช้ได้: การกิน, การนอนและขับถ่าย, การเดิน, ยา, อารมณ์, เรื่องดี, อื่น ๆ
- ห้ามวินิจฉัยโรคหรือแนะนำยา severity เป็นแค่การชวนสังเกต ไม่ใช่การวินิจฉัย
- ตอบกลับเป็น JSON array เท่านั้น เช่น [{"category":"การกิน","text":"กินน้อยลง","severity":6}] ห้ามมีข้อความอื่น`;

export type OrganizedItem = { category: string; text: string; severity: number };

function clampSeverity(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : 5; // default medium
}

export async function organizeNarrative(story: string): Promise<OrganizedItem[]> {
  const { text } = await generateText({
    model: provider(process.env.AI_MODEL!),
    system: ORGANIZE_SYSTEM,
    prompt: story,
    temperature: 0.2,
  });

  // Defensive parse: small local models may wrap or chatter around the JSON.
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      const items = (Array.isArray(arr) ? arr : [])
        .map((x) => ({
          category: String(x?.category ?? "อื่น ๆ").trim(),
          text: String(x?.text ?? "").trim(),
          severity: clampSeverity(x?.severity),
        }))
        .filter((x) => x.text);
      if (items.length) return items;
    } catch {
      // fall through to fallback
    }
  }
  // Fallback: keep the caregiver's words rather than losing them.
  return [{ category: "อื่น ๆ", text: story.trim(), severity: 5 }];
}
