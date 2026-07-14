import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, generateText } from "ai";

// Server-side only. Endpoint + key live in env, never shipped to the client (AGENTS.md rule 1).
const provider = createOpenAICompatible({
  name: "gemma-med",
  baseURL: process.env.AI_BASE_URL!,
  apiKey: process.env.AI_API_KEY,
  // ponytail: thinking models (e.g. ThaiLLM/Qwen3) route their answer into `reasoning`,
  // leaving streamed `content` empty. reasoning_effort:"none" disables that at the /v1 layer.
  // Harmless for non-thinking models — Ollama ignores the field. Injected for every caller.
  fetch: async (url, init) => {
    if (typeof init?.body === "string" && String(url).includes("/chat/completions")) {
      try {
        const b = JSON.parse(init.body);
        b.reasoning_effort ??= "none";
        init = { ...init, body: JSON.stringify(b) };
      } catch {}
    }
    return fetch(url, init);
  },
});

// The disclaimer the UI always renders under AI output (AGENTS.md rule 3).
export const AI_DISCLAIMER =
  "สรุปนี้ช่วยจัดระเบียบข้อมูลจากสมุดเท่านั้น ไม่ใช่การวินิจฉัยหรือสั่งยา · กรุณาปรึกษาแพทย์ทุกครั้ง";

// The model summarizes/organizes — it does not diagnose or prescribe (AGENTS.md rule 2).
const SYSTEM_PROMPT = `คุณคือผู้ช่วยเรียบเรียงข้อมูลสุขภาพเป็นภาษาไทย สำหรับให้ผู้ดูแลนำไปเล่าให้คุณหมอฟัง
กฎที่ต้องทำตามเสมอ:
- สรุปและจัดระเบียบข้อมูลที่ได้รับเท่านั้น ห้ามวินิจฉัยโรคหรือสั่ง/แนะนำยาเด็ดขาด
- ใช้เฉพาะข้อมูลที่ให้มา ห้ามเดาหรือเติมข้อมูลที่ไม่มี
- เขียนสั้น กระชับ อ่านง่าย เป็นหัวข้อ ด้วยน้ำเสียงอ่อนโยน
- ถ้าข้อมูลไม่พอ ให้บอกว่ายังไม่มีข้อมูลในส่วนนั้น
- เรื่องสิทธิ/บริการ: อ้างอิงได้เฉพาะรายการที่ระบบตรวจสอบสิทธิให้มาแล้วเท่านั้น ห้ามตัดสินเองว่าใครมีสิทธิหรือไม่ ห้ามเดาบริการที่ไม่ได้ให้มา
- โรคที่ "อาจเกี่ยวข้อง": เป็นการชวนสังเกตจากอาการ ไม่ใช่การวินิจฉัย ให้เขียนทำนอง "อาการนี้อาจเกี่ยวข้องกับ X ควรให้คุณหมอตรวจยืนยัน" ห้ามระบุว่าผู้ป่วยเป็นโรคนั้นแน่นอน`;

export type SummaryData = {
  name: string;
  diseases?: string | null;
  allergies: string[];
  meds: { name: string; schedule?: string | null }[];
  weights: { kg: number; at: Date; note?: string | null }[];
  visits: { symptom?: string | null; medsReceived?: string | null; nextAppointment?: string | null; at: Date }[];
  coverage?: string | null; // สิทธิการรักษา เช่น บัตรทอง
  rights?: string | null; // บริการที่มีสิทธิ (คำนวณ deterministic จาก lib/rights.ts แล้ว)
  suspected?: string | null; // โรคที่ระบบสังเกตจากอาการว่าอาจเกี่ยวข้อง (ยังไม่ยืนยัน)
};

// The closing instruction is per-task (passed in) so the data block stays task-neutral —
// otherwise a summary instruction leaks into the signals task and contradicts its system prompt.
function buildUserPrompt(d: SummaryData, closing: string): string {
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
  // Suspected diseases come from a deterministic symptom heuristic — NOT confirmed.
  if (d.suspected) lines.push(`อาการที่ระบบสังเกตว่าอาจเกี่ยวข้องกับ (ยังไม่ยืนยัน ควรให้หมอตรวจ): ${d.suspected}`);
  // Rights are pre-decided deterministically — the model only references them, never decides.
  if (d.rights) lines.push(`บริการที่มีสิทธิ (ระบบตรวจสอบสิทธิให้แล้ว): ${d.rights}`);
  lines.push("\n" + closing);
  return lines.join("\n");
}

// Per-task closing instructions (kept out of the data block above).
const SUMMARY_CLOSING =
  "ช่วยเรียบเรียงข้อมูลข้างต้นเป็นสรุปสั้น ๆ สำหรับเล่าให้คุณหมอฟัง อ้างอิงสิทธิ/บริการที่ให้มาได้ถ้าเกี่ยวข้อง";
const SIGNALS_CLOSING =
  'จากข้อมูลข้างต้น ช่วยชี้ "จุดที่ควรชวนสังเกต" ไม่เกิน 3 ข้อ สั้น ๆ เป็นข้อ ๆ (ห้ามเขียนสรุปประวัติซ้ำ) ถ้ายังไม่มีสัญญาณที่ชัดเจนให้บอกตามตรง';

function run(system: string, prompt: string) {
  // frequencyPenalty curbs the repetition ThaiLLM (Q4) tends to produce at low temperature —
  // e.g. duplicating whole care-guide headings. Mild value keeps wording natural.
  return streamText({
    model: provider(process.env.AI_MODEL!),
    system,
    prompt,
    temperature: 0.3,
    frequencyPenalty: 0.4,
  });
}

export function streamDoctorSummary(data: SummaryData) {
  return run(SYSTEM_PROMPT, buildUserPrompt(data, SUMMARY_CLOSING));
}

// §4.2 Health signals — observe recurring patterns, never diagnose.
const SIGNALS_SYSTEM = `คุณช่วยสังเกตแนวโน้มจากบันทึกสุขภาพเป็นภาษาไทย เพื่อ "ชวนสังเกต" ไม่ใช่การวินิจฉัยโรค
กฎ:
- ชี้จุดที่ควรใส่ใจจากข้อมูลที่ให้มาเท่านั้น เป็นข้อ ๆ สั้น ๆ (ไม่เกิน 3 ข้อ)
- ห้ามวินิจฉัยโรคหรือแนะนำยา ใช้น้ำเสียงอ่อนโยน ชวนสังเกต
- ถ้าข้อมูลยังน้อยเกินไป ให้บอกว่ายังไม่มีสัญญาณที่ชัดเจน`;

export function streamHealthSignals(data: SummaryData) {
  return run(SIGNALS_SYSTEM, buildUserPrompt(data, SIGNALS_CLOSING));
}

// §4.3 Care-guide suggestions — draft bullets the caregiver edits before saving.
const CARE_SYSTEM = `คุณช่วยร่างหัวข้อ "คู่มือดูแล" เป็นภาษาไทย ให้ผู้ดูแลนำไปปรับแก้เองก่อนบันทึก
กฎ:
- เสนอเป็นข้อ ๆ สั้น ๆ เรื่องการกิน การเดิน การนอน และการใช้ยาตามที่ให้มา
- แต่ละหัวข้อเขียนครั้งเดียว ห้ามเขียนหัวข้อหรือเนื้อหาซ้ำ
- ห้ามวินิจฉัยโรคหรือสั่งยา เป็นเพียงแนวทางดูแลทั่วไปที่ครอบครัวปรับได้
- อ้างอิงเฉพาะโรคและยาที่ให้มา
- เรื่องสิทธิ/บริการ: ถ้ามีบริการที่มีสิทธิที่ช่วยการดูแลได้ ให้แนะนำสั้น ๆ ว่าไปใช้บริการนั้นได้ อ้างอิงเฉพาะรายการที่ระบบตรวจสอบสิทธิให้มาแล้ว ห้ามตัดสินสิทธิเองหรือเดา`;

function buildCarePrompt(d: SummaryData): string {
  const lines = [
    `ผู้ป่วย: ${d.name}${d.diseases ? ` (${d.diseases})` : ""}`,
    `ยาที่ใช้: ${d.meds.length ? d.meds.map((m) => m.name).join(", ") : "ไม่มีข้อมูล"}`,
  ];
  if (d.coverage) lines.push(`สิทธิการรักษา: ${d.coverage}`);
  if (d.rights) lines.push(`บริการที่มีสิทธิ (ระบบตรวจสอบสิทธิให้แล้ว): ${d.rights}`);
  lines.push("ช่วยร่างหัวข้อคู่มือดูแลสั้น ๆ ให้ครอบครัวนำไปปรับแก้ แนะนำบริการที่มีสิทธิได้ถ้าเกี่ยวข้อง");
  return lines.join("\n");
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

// §4.4 Drug-label scan — read a photo of a drug label into structured fields. Reads only, never prescribes.
// ponytail: a vision model reads the image directly (replaces the OpenCV/PaddleOCR sidecar) so this
// runs on Vercel as a plain API call. Kept on its own env (OCR_VISION_MODEL) so swapping it doesn't
// touch the doctor-summary/signals models.
const LABEL_SYSTEM = `คุณช่วยอ่านฉลากยาจากรูปภาพที่ถ่ายมา แล้วแยกเป็นข้อมูลโครงสร้าง เป็นภาษาไทย
กฎ:
- ดึงเฉพาะข้อมูลที่ปรากฏในรูปเท่านั้น ห้ามเดา ห้ามเติมข้อมูลที่ไม่มี ห้ามแนะนำหรือแก้ไขขนาดยา
- ตัวอักษรในรูปอาจไม่ชัดหรือเบลอบ้าง ให้ตีความเท่าที่พออ่านได้เท่านั้น
- ถ้ารูปอ่านไม่ออก ไม่สมเหตุสมผล หรือไม่ใช่ฉลากยาเลย
  ห้ามคิดชื่อยาหรือข้อมูลใด ๆ ขึ้นเองเด็ดขาด ให้ตอบค่าว่างทุกช่องแทน
- ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
  {"name":"","quantity":"","usage":"","mealTiming":""}
  - name: ชื่อยาพร้อมความแรงถ้ามีระบุ เช่น "Paracetamol 500 mg"
  - quantity: จำนวนที่ระบุ เช่น "20 เม็ด"
  - usage: วิธีใช้ตามฉลาก เช่น "รับประทานครั้งละ 1 เม็ด ทุก 6 ชั่วโมง เมื่อมีอาการปวด"
  - mealTiming: หนึ่งใน "ก่อนอาหาร", "หลังอาหาร", "ไม่ระบุ"
  ช่องไหนไม่มีข้อมูลให้เป็นสตริงว่าง ""`;

export type DrugLabelInfo = { name: string; quantity: string; usage: string; mealTiming: string };

const emptyLabel: DrugLabelInfo = { name: "", quantity: "", usage: "", mealTiming: "ไม่ระบุ" };

const VISION_MODEL = () => process.env.OCR_VISION_MODEL || "qwen2.5-vl:7b";

export async function structureDrugLabel(imageDataUrl: string): Promise<DrugLabelInfo> {
  if (!imageDataUrl) return emptyLabel;

  const { text } = await generateText({
    model: provider(VISION_MODEL()),
    system: LABEL_SYSTEM,
    messages: [{ role: "user", content: [
      { type: "text", text: "อ่านฉลากยาในรูปนี้แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด" },
      { type: "image", image: imageDataUrl },
    ] }],
    temperature: 0.1,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        name: String(obj?.name ?? "").trim(),
        quantity: String(obj?.quantity ?? "").trim(),
        usage: String(obj?.usage ?? "").trim(),
        mealTiming: String(obj?.mealTiming ?? "ไม่ระบุ").trim() || "ไม่ระบุ",
      };
    } catch {
      // fall through to fallback
    }
  }
  return emptyLabel;
}

// §4.5 Appointment-slip scan — read a photo of an appointment/referral slip into structured fields.
const APPOINTMENT_SYSTEM = `คุณช่วยอ่านใบนัดโรงพยาบาลจากรูปภาพที่ถ่ายมา แล้วแยกเป็นข้อมูลโครงสร้าง เป็นภาษาไทย
กฎ:
- ดึงเฉพาะข้อมูลที่ปรากฏในรูปเท่านั้น ห้ามเดา ห้ามเติมข้อมูลที่ไม่มี
- ตัวอักษรในรูปอาจไม่ชัดหรือเบลอบ้าง ให้ตีความเท่าที่พออ่านได้เท่านั้น
- ถ้ารูปอ่านไม่ออก ไม่สมเหตุสมผล หรือไม่ใช่ใบนัดเลย
  ห้ามคิดชื่อโรงพยาบาล แผนก หรือแพทย์ขึ้นเองเด็ดขาด ให้ตอบค่าว่างทุกช่องแทน
- ห้ามคำนวณเลขปีเอง (แปลง พ.ศ. เป็น ค.ศ. ฯลฯ) ให้ตอบ "year" เป็นตัวเลขปีตามที่เห็นบนใบนัดตรง ๆ เท่านั้น
  โค้ดจะเป็นผู้แปลงปีให้เอง ไม่ใช่หน้าที่ของคุณ — หน้าที่คุณคือแปลง "ชื่อเดือน" เป็นตัวเลข 1-12 เท่านั้น
- ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
  {"day":"","month":"","year":"","time":"","hospital":"","department":"","doctor":""}
  - day: วันที่ ตัวเลข 1-31 ตามที่ปรากฏ (ถ้าไม่มีให้เป็น "")
  - month: เดือน ตัวเลข 1-12 (แปลงจากชื่อเดือนไทยเป็นตัวเลข เช่น "มีนาคม" → "3") (ถ้าไม่มีให้เป็น "")
  - year: ปี ตัวเลขดิบตามที่ปรากฏบนใบนัด ห้ามแปลง พ.ศ./ค.ศ. เอง (ถ้าไม่มีให้เป็น "")
  - time: เวลานัด รูปแบบ 24 ชั่วโมง "HH:mm" เช่น "09:30" (ถ้าไม่มีให้เป็น "")
  - hospital: ชื่อโรงพยาบาลหรือสถานพยาบาล
  - department: แผนกหรือคลินิก เช่น "อายุรกรรม"
  - doctor: ชื่อแพทย์ผู้ตรวจ (ถ้ามีระบุ)
  ช่องไหนไม่มีข้อมูลให้เป็นสตริงว่าง ""`;

export type AppointmentSlipInfo = {
  date: string;
  time: string;
  hospital: string;
  department: string;
  doctor: string;
};

const emptyAppointment: AppointmentSlipInfo = { date: "", time: "", hospital: "", department: "", doctor: "" };

// Buddhist Era -> Gregorian is a deterministic subtraction — never let the LLM do this arithmetic itself
// (observed it getting 2569-543 wrong). Model only extracts day/month/year as printed; code does the math.
function buildIsoDate(day: unknown, month: unknown, year: unknown): string {
  const d = parseInt(String(day), 10);
  const m = parseInt(String(month), 10);
  let y = parseInt(String(year), 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return "";
  if (y > 2400) y -= 543; // พ.ศ. -> ค.ศ.
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function structureAppointmentSlip(imageDataUrl: string): Promise<AppointmentSlipInfo> {
  if (!imageDataUrl) return emptyAppointment;

  const { text } = await generateText({
    model: provider(VISION_MODEL()),
    system: APPOINTMENT_SYSTEM,
    messages: [{ role: "user", content: [
      { type: "text", text: "อ่านใบนัดในรูปนี้แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด" },
      { type: "image", image: imageDataUrl },
    ] }],
    temperature: 0.1,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        date: buildIsoDate(obj?.day, obj?.month, obj?.year),
        time: String(obj?.time ?? "").trim(),
        hospital: String(obj?.hospital ?? "").trim(),
        department: String(obj?.department ?? "").trim(),
        doctor: String(obj?.doctor ?? "").trim(),
      };
    } catch {
      // fall through to fallback
    }
  }
  return emptyAppointment;
}
