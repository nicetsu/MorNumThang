import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, generateText } from "ai";
import { WHEN_TIME_VALUES } from "@/lib/meds";

// Preset = base+key+model as a set so you never mix one provider's URL with another's model.
// Two independent lanes: TEXT (summaries/organize) and VISION (photo OCR) — each picks its own
// preset and can be overridden per-value by env. Text is Thai chat (typhoon on thaillm.or.th);
// vision needs a multimodal model (glm-4.5v on z.ai). (AGENTS.md rule 1: server-side only.)
// ponytail: three hardcoded presets, not a plugin registry — add one the day there is a fourth.
const PRESETS = {
  nvidia: {
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    model: "google/diffusiongemma-26b-a4b-it",
  },
  zai: {
    baseURL: "https://api.z.ai/api/paas/v4",
    apiKey: process.env.ZAI_API_KEY,
    model: "glm-4.5v", // vision-capable
  },
  thaillm: {
    baseURL: "http://thaillm.or.th/api/v1",
    apiKey: process.env.THAILLM_API_KEY,
    model: "typhoon-s-thaillm-8b-instruct", // Thai chat, fast, no <think> block
  },
};

// TEXT lane — Thai summaries/organize. Default thaillm/typhoon.
const TEXT_PROVIDER = (process.env.AI_PROVIDER ?? "thaillm") as keyof typeof PRESETS;
const textPreset = PRESETS[TEXT_PROVIDER] ?? PRESETS.thaillm;
const AI_BASE_URL = process.env.AI_BASE_URL || textPreset.baseURL;
const AI_API_KEY = process.env.AI_API_KEY || textPreset.apiKey;
const AI_MODEL = process.env.AI_MODEL || textPreset.model;

// VISION lane — photo OCR (drug label / appointment slip). Default zai/glm-4.5v.
const VISION_PROVIDER = (process.env.VISION_PROVIDER ?? "zai") as keyof typeof PRESETS;
const visionPreset = PRESETS[VISION_PROVIDER] ?? PRESETS.zai;
const VISION_BASE_URL = process.env.VISION_BASE_URL || visionPreset.baseURL;
const VISION_API_KEY = process.env.VISION_API_KEY || visionPreset.apiKey;
const VISION_MODEL = process.env.VISION_MODEL || visionPreset.model;

// Disable model "thinking": each provider spells it differently. Reasoning eats the response
// budget and truncates short Thai summaries; medical safety stays deterministic code regardless.
function disableThinking(b: Record<string, unknown>, kind: keyof typeof PRESETS) {
  if (kind === "zai") {
    b.thinking = { type: "disabled" };
  } else if (kind === "thaillm") {
    // vLLM: rejects reasoning_effort:"none"; typhoon emits no think anyway. Flag is belt-and-suspenders.
    b.chat_template_kwargs = { ...(b.chat_template_kwargs as object), enable_thinking: false };
  } else {
    b.reasoning_effort ??= "none";
    b.chat_template_kwargs = { ...(b.chat_template_kwargs as object), enable_thinking: false };
  }
  return b;
}

// Server-side only. Endpoint + key live in env, never shipped to the client (AGENTS.md rule 1).
const provider = createOpenAICompatible({
  name: TEXT_PROVIDER,
  baseURL: AI_BASE_URL,
  apiKey: AI_API_KEY,
  fetch: async (url, init) => {
    if (typeof init?.body === "string" && String(url).includes("/chat/completions")) {
      try {
        init = { ...init, body: JSON.stringify(disableThinking(JSON.parse(init.body), TEXT_PROVIDER)) };
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
- สรุปและจัดระเบียบเฉพาะข้อมูลที่ได้รับเท่านั้น ห้ามวินิจฉัยโรคหรือสั่ง/แนะนำยาเด็ดขาด
- ใช้เฉพาะข้อมูลที่ให้มา ห้ามเดาหรือเติมข้อมูลที่ไม่มี
- ห้ามเพิ่มหัวข้อที่ไม่มีข้อมูลรองรับ ถ้าเรื่องใดไม่มีข้อมูล ให้ข้ามไปเลย ไม่ต้องเขียนถึง
- เขียนสั้น กระชับ อ่านง่าย เป็นหัวข้อ ด้วยน้ำเสียงอ่อนโยน ไม่ต้องมีคำเตือนหรือหัวข้อสรุปซ้ำท้าย
- เรื่องสิทธิ/บริการการรักษา: เขียนถึงได้เฉพาะเมื่อมีรายการที่ระบบตรวจสอบสิทธิให้มาในข้อมูลเท่านั้น
  ถ้าข้อมูลที่ให้มาไม่มีเรื่องสิทธิ/บริการ ห้ามเขียนถึงสิทธิหรือบริการใด ๆ เลย แม้แต่จะบอกว่า "ยังไม่มีข้อมูลสิทธิ" ก็ห้ามเขียน ให้ข้ามเรื่องนี้ไปทั้งหมด
  ห้ามเดาชื่อสิทธิ เช่น บัตรทอง ประกันสังคม สปสช. โดยเด็ดขาด
- โรคที่ "อาจเกี่ยวข้อง": เป็นการชวนสังเกตจากอาการ ไม่ใช่การวินิจฉัย ให้เขียนทำนอง "อาการนี้อาจเกี่ยวข้องกับ X ควรให้คุณหมอตรวจยืนยัน" ห้ามระบุว่าผู้ป่วยเป็นโรคนั้นแน่นอน`;

export type SummaryData = {
  name: string;
  diseases?: string | null;
  allergies: string[];
  meds: { name: string; schedule?: string | null }[];
  weights: { kg: number; at: Date; note?: string | null }[];
  // อาการ/เรื่องที่บ้านจดลงสมุด (Observation) — severity 0–10 คือ "ความควรใส่ใจ" ไม่ใช่การวินิจฉัย
  observations?: { category: string; text: string; severity: number; at: Date }[];
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
  // อาการที่บ้านจดลงสมุด — the caregiver's actual daily notes. Mark high-attention items
  // (severity ≥8) so the doctor can prioritize; severity is "ชวนสังเกต", not a diagnosis.
  if (d.observations?.length) {
    lines.push("อาการ/สิ่งที่บ้านจดลงสมุด (ล่าสุด):");
    for (const o of d.observations) {
      const flag = o.severity >= 8 ? " [ที่บ้านกังวลมาก]" : "";
      lines.push(`- ${o.category}: ${o.text} (${o.at.toLocaleDateString("th-TH")})${flag}`);
    }
  }
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
  // Mild frequency penalty keeps short Thai sections from repeating.
  return streamText({
    model: provider(AI_MODEL),
    system,
    prompt,
    temperature: 0.3,
    frequencyPenalty: 0.4,
  });
}

export function streamDoctorSummary(data: SummaryData) {
  return run(SYSTEM_PROMPT, buildUserPrompt(data, SUMMARY_CLOSING));
}

// Belt-and-suspenders: the prompt forbids it, but ~1/6 of the time typhoon still slips in a line
// denying it has สิทธิ data ("ไม่มีข้อมูลสิทธิ…") when none was provided. Drop any such line.
// Line-buffered so it works mid-stream without peeking at the tail. Kept lines keep their newline.
// ponytail: string filter over a couple of stock phrasings — ceiling: won't split a mixed line, and
// would drop a genuine "ไม่มี…สิทธิ" observation; neither occurs in this app's data. Tighten if one does.
const DENY_RIGHTS_LINE = /(ไม่มี|ยังไม่)[^\n]{0,12}สิทธิ/;
export function stripDenyRightsLines(src: ReadableStream<string>): ReadableStream<string> {
  let buf = "";
  return src.pipeThrough(
    new TransformStream<string, string>({
      transform(chunk, ctrl) {
        buf += chunk;
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl + 1);
          buf = buf.slice(nl + 1);
          if (!DENY_RIGHTS_LINE.test(line)) ctrl.enqueue(line);
        }
      },
      flush(ctrl) {
        if (buf && !DENY_RIGHTS_LINE.test(buf)) ctrl.enqueue(buf);
      },
    }),
  );
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

// Inline สิทธิ suggestion — one short sentence tailored to the current symptom + สิทธิ.
// Eligibility (direction, free-med availability) is decided in code and handed in as fact;
// the model only phrases it for the specific symptom (AGENTS.md rule 2).
const RIGHTS_ADVICE_SYSTEM = `คุณช่วยบอกผู้ดูแลสั้น ๆ ว่าจะใช้สิทธิการรักษากับอาการตอนนี้อย่างไร เป็นภาษาไทย
กฎ:
- ใช้เฉพาะข้อเท็จจริงที่ให้มา สิทธิและการรับยาฟรีถูกตรวจสอบมาแล้ว ห้ามตัดสินสิทธิเอง ห้ามเดา
- ทำตาม "แนวทาง" ที่ให้มา:
  - ถ้าแนวทาง = รับยาฟรี และ "รับยาฟรีได้ = ใช่" ให้บอกว่าอาการเล็กน้อยนี้ไปรับยาฟรีที่ร้านยาคุณภาพที่เข้าร่วมได้เลย ไม่ต้องไปโรงพยาบาล ระบุชื่ออาการด้วย
  - ถ้าแนวทาง = รับยาฟรี แต่ "รับยาฟรีได้ = ไม่" ให้บอกว่าซื้อยาสามัญที่ร้านยาใกล้บ้านได้ (แบบชำระเงินเอง)
  - ถ้าแนวทาง = พบแพทย์ ให้บอกว่าควรพาไปพบแพทย์โดยใช้สิทธิที่มี
- ห้ามวินิจฉัยโรค ห้ามสั่งยาหรือระบุชื่อยา น้ำเสียงอ่อนโยน
- ตอบเป็นข้อความสั้นประโยคเดียว ไม่เกิน 1-2 บรรทัด ไม่ต้องมีหัวข้อหรือ bullet`;

export type RightsAdviceData = {
  name: string;
  coverage?: string | null;
  direction: "free-med" | "doctor";
  freeMedAvailable: boolean; // deterministic: does their สิทธิ grant free meds
  freeMedFacility: string;
  symptom?: string | null; // the matched minor symptom, if any
  recentSymptoms: string[]; // recent note texts (context for phrasing)
  eligibleServices?: string | null; // deterministic เวชกรรม services (doctor direction)
};

function buildRightsPrompt(d: RightsAdviceData): string {
  const lines = [
    `ผู้ป่วย: ${d.name}`,
    `สิทธิการรักษา: ${d.coverage ?? "ยังไม่ระบุ"}`,
    `แนวทาง: ${d.direction === "free-med" ? "รับยาฟรี" : "พบแพทย์"}`,
    `รับยาฟรีได้: ${d.freeMedAvailable ? "ใช่" : "ไม่"}`,
    `ร้านรับยาฟรี: ${d.freeMedFacility}`,
  ];
  if (d.symptom) lines.push(`อาการเล็กน้อยที่ตรงรายการรับยาฟรี: ${d.symptom}`);
  if (d.recentSymptoms.length) lines.push(`สิ่งที่บ้านจดล่าสุด: ${d.recentSymptoms.slice(0, 4).join("; ")}`);
  if (d.eligibleServices) lines.push(`บริการที่มีสิทธิ (ระบบตรวจสอบแล้ว): ${d.eligibleServices}`);
  lines.push("\nช่วยเขียนคำแนะนำสั้น ๆ ประโยคเดียวตามแนวทางข้างต้น");
  return lines.join("\n");
}

export function streamRightsAdvice(data: RightsAdviceData) {
  return run(RIGHTS_ADVICE_SYSTEM, buildRightsPrompt(data));
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
    model: provider(AI_MODEL),
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

// §4.3b Visit-note "ยาที่ได้รับมา" — parse the free text a caregiver types after a doctor
// visit into medication entries for review before they're added to the meds list. Extracts
// only; whenTime is constrained to WHEN_TIME_VALUES so a bad read can't invent a schedule.
const MEDS_RECEIVED_SYSTEM = `คุณช่วยแยกยาที่หมอให้มาจากข้อความที่ผู้ดูแลพิมพ์ เป็นภาษาไทย
กฎ:
- แยกยาแต่ละตัวที่ระบุในข้อความออกเป็นข้อ ๆ ห้ามเดาหรือเติมยาที่ไม่มี ห้ามแนะนำหรือเปลี่ยนขนาดยา
- แต่ละข้อมี "name" (ชื่อยา), "dose" (จำนวนเม็ดต่อครั้ง ถ้าไม่ระบุให้เป็น 1), "whenTime" (ช่วงเวลาทานยา)
- whenTime เลือกจาก ["${WHEN_TIME_VALUES.join('","')}"] เท่านั้น ถ้าข้อความไม่ได้ระบุช่วงเวลาชัดเจน ให้ใช้ "ตามแพทย์สั่ง"
- ตอบกลับเป็น JSON array เท่านั้น เช่น [{"name":"ยาความดัน","dose":1,"whenTime":"หลังอาหารเช้า"}] ห้ามมีข้อความอื่น`;

export type ReceivedMedItem = { name: string; dose: number; whenTime: string };

export async function organizeMedsReceived(text: string): Promise<ReceivedMedItem[]> {
  const { text: out } = await generateText({
    model: provider(AI_MODEL),
    system: MEDS_RECEIVED_SYSTEM,
    prompt: text,
    temperature: 0.2,
  });

  const match = out.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    return (Array.isArray(arr) ? arr : [])
      .map((x) => {
        const dose = Math.round(Number(x?.dose));
        const whenTime = String(x?.whenTime ?? "");
        return {
          name: String(x?.name ?? "").trim(),
          dose: Number.isFinite(dose) && dose > 0 ? dose : 1,
          whenTime: (WHEN_TIME_VALUES as readonly string[]).includes(whenTime) ? whenTime : "ตามแพทย์สั่ง",
        };
      })
      .filter((x) => x.name);
  } catch {
    return [];
  }
}

// §4.4 Drug-label scan — the same multimodal model reads the image. Reads only, never prescribes.
const LABEL_SYSTEM = `คุณช่วยอ่านฉลากยาจากรูปภาพที่ถ่ายมา แล้วแยกเป็นข้อมูลโครงสร้าง เป็นภาษาไทย
กฎ:
- ดึงเฉพาะข้อมูลที่ปรากฏในรูปเท่านั้น ห้ามเดา ห้ามเติมข้อมูลที่ไม่มี ห้ามแนะนำหรือแก้ไขขนาดยา
- ตัวอักษรในรูปอาจไม่ชัดหรือเบลอบ้าง ให้ตีความเท่าที่พออ่านได้เท่านั้น
- ถ้ารูปอ่านไม่ออก ไม่สมเหตุสมผล หรือไม่ใช่ฉลากยาเลย
  ห้ามคิดชื่อยาหรือข้อมูลใด ๆ ขึ้นเองเด็ดขาด ให้ตอบค่าว่างทุกช่องแทน
- ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
  {"name":"","quantity":"","usage":"","mealTiming":"","times":[]}
  - name: ชื่อยาพร้อมความแรงถ้ามีระบุ เช่น "Paracetamol 500 mg"
  - quantity: จำนวนที่ระบุ เช่น "20 เม็ด"
  - usage: วิธีใช้ตามฉลาก เช่น "รับประทานครั้งละ 1 เม็ด ทุก 6 ชั่วโมง เมื่อมีอาการปวด"
  - mealTiming: หนึ่งใน "ก่อนอาหาร", "หลังอาหาร", "ไม่ระบุ"
  - times: ช่วงเวลาที่ต้องกินยาตามที่ระบุบนฉลาก เป็น array เลือกจาก ["เช้า","กลางวัน","เย็น","ก่อนนอน"] เท่านั้น
    ฉลากอาจระบุช่วงเวลาไว้หลายแบบ ให้ตีความตามที่เห็นจริง แล้วแปลงเป็น 4 คำนี้เสมอ:
    - เครื่องหมายถูก/ระบายทึบ/เขียนคำ "เช้า" "กลางวัน" "เย็น" "ก่อนนอน" ไว้ตรงไหน ใส่ช่วงนั้น (เช่น "วันละ 3 ครั้ง เช้า กลางวัน เย็น" → ["เช้า","กลางวัน","เย็น"])
    - รหัสตัวเลขคั่นขีด (เช่น "1-0-1" หรือ "1-1-1-1") ตำแหน่งคือ เช้า-กลางวัน-เย็น-(ก่อนนอน ถ้ามีตัวที่ 4) ตามลำดับ ตัวที่ไม่ใช่ 0 คือช่วงที่ต้องกิน (เช่น "1-0-1" → ["เช้า","เย็น"])
    - เวลานาฬิกาตรง ๆ (เช่น "08.00 น., 20.00 น.") แปลงเป็นช่วงที่ใกล้เคียงที่สุด: ก่อน 11 โมง = เช้า, 11-16 โมง = กลางวัน, 17 โมงขึ้นไป = เย็น เว้นแต่ฉลากเขียนว่า "ก่อนนอน" กำกับไว้ชัดเจน
    ถ้าฉลากไม่ได้ระบุช่วงเวลาแบบใดข้างต้นเลย ให้เป็น [] ห้ามเดา
  ช่องไหนไม่มีข้อมูลให้เป็นสตริงว่าง "" (ยกเว้น times ที่ให้เป็น [])`;

export type DrugLabelInfo = { name: string; quantity: string; usage: string; mealTiming: string; times: string[] };

const emptyLabel: DrugLabelInfo = { name: "", quantity: "", usage: "", mealTiming: "ไม่ระบุ", times: [] };

// Direct fetch keeps the image payload explicit and lets us disable thinking for compact JSON.
async function visionExtract(system: string, ask: string, imageDataUrl: string): Promise<string> {
  const res = await fetch(`${VISION_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VISION_API_KEY}` },
    body: JSON.stringify(disableThinking({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: ask },
        ] },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      stream: false,
    }, VISION_PROVIDER)),
  });
  if (!res.ok) throw new Error(`OCR vision error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function structureDrugLabel(imageDataUrl: string): Promise<DrugLabelInfo> {
  if (!imageDataUrl) return emptyLabel;

  const text = await visionExtract(LABEL_SYSTEM, "อ่านฉลากยาในรูปนี้แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด", imageDataUrl);

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      const allowed = ["เช้า", "กลางวัน", "เย็น", "ก่อนนอน"];
      return {
        name: String(obj?.name ?? "").trim(),
        quantity: String(obj?.quantity ?? "").trim(),
        usage: String(obj?.usage ?? "").trim(),
        mealTiming: String(obj?.mealTiming ?? "ไม่ระบุ").trim() || "ไม่ระบุ",
        times: (Array.isArray(obj?.times) ? obj.times : []).map((t: unknown) => String(t).trim()).filter((t: string) => allowed.includes(t)),
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
  - time: เวลานัด รูปแบบ 24 ชั่วโมง "HH:mm" เช่น "09:30" ถ้าใบนัดระบุมากกว่า 1 เวลา (เช่นช่วงเวลาหรือหลายเวลาให้เลือก)
    ให้เขียนมาตามที่เห็นทุกเวลา คั่นด้วยจุลภาค เช่น "09:00,13:00" ห้ามเลือกเองว่าจะใช้เวลาไหน (ถ้าไม่มีให้เป็น "")
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

// A slip can print more than one time (a range, or a couple of options) — pick the earliest
// and always emit strict "HH:mm", since <input type="time"> silently drops anything else.
// Model only extracts what's printed; code picks/normalizes (mirrors buildIsoDate above).
function normalizeTime(raw: string): string {
  const matches = [...raw.matchAll(/([01]?\d|2[0-3])[:.]([0-5]\d)/g)];
  if (!matches.length) return "";
  let best = Infinity;
  for (const m of matches) {
    const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    if (total < best) best = total;
  }
  return `${String(Math.floor(best / 60)).padStart(2, "0")}:${String(best % 60).padStart(2, "0")}`;
}

export async function structureAppointmentSlip(imageDataUrl: string): Promise<AppointmentSlipInfo> {
  if (!imageDataUrl) return emptyAppointment;

  const text = await visionExtract(APPOINTMENT_SYSTEM, "อ่านใบนัดในรูปนี้แล้วตอบเป็น JSON ตามรูปแบบที่กำหนด", imageDataUrl);

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        date: buildIsoDate(obj?.day, obj?.month, obj?.year),
        time: normalizeTime(String(obj?.time ?? "")),
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
