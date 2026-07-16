// End-to-end evaluation of the risk pipeline against the REAL text model (organizeNarrative)
// + the deterministic risk engine (lib/risk.ts). Run: `npx tsx scripts/risk-eval.mts`
// Feeds realistic Thai caregiver narratives, prints the model's extraction (category/severity/
// signs) and the resulting doctor-score escalation (keyword-only vs keyword∪LLM). See
// docs/risk-eval-results.md for a captured run. NOT part of the app build (dev/eval only).
import { readFileSync } from "node:fs";
// Load .env into process.env before importing lib/ai (the provider reads env at module load).
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { organizeNarrative } = await import("../lib/ai");
const { observationBand, observationEscalationLevel } = await import("../lib/risk");

const LV = ["ปกติ", "-", "ควรสังเกต", "ควรปรึกษาหมอ"];
const bandToLv = (b: number) => (b === 0 ? 0 : b === 1 ? 2 : 3);

export const SCENARIOS: { text: string; age: number; expect: string }[] = [
  { text: "วันนี้ม้ากินข้าวได้น้อยลงมาก ดูอ่อนเพลีย", age: 78, expect: "ควรสังเกต (soft sign ผู้สูงอายุ)" },
  { text: "ม้าปวดท้องมาตั้งแต่เช้า อาเจียนออกมามีเลือดปน", age: 80, expect: "ควรปรึกษาหมอ (danger: เลือด)" },
  { text: "ม้าปวดหัวนิดหน่อย กินยาพาราแล้วดีขึ้น", age: 75, expect: "ปกติ (ธรรมดา + หายแล้ว)" },
  { text: "เมื่อคืนม้าเจ็บหน้าอก เหงื่อแตก หายใจไม่ทัน", age: 70, expect: "ควรปรึกษาหมอ (Class A)" },
  { text: "วันนี้ม้าอารมณ์ดี กินข้าวหมดจาน", age: 80, expect: "ปกติ (เรื่องดี)" },
  { text: "ม้าซึมลง เรียกไม่ค่อยรู้เรื่อง ไม่ยอมกินข้าว 2 วันแล้ว", age: 82, expect: "ควรปรึกษาหมอ (delirium)" },
  { text: "ม้าไม่มีไข้ ไม่ปวดอะไร สบายดี", age: 80, expect: "ปกติ (negation)" },
  { text: "ม้าตัวร้อน ไข้ขึ้นสูง หนาวสั่นทั้งตัว", age: 80, expect: "ควรปรึกษาหมอ (ไข้สูง+หนาวสั่น)" },
  { text: "ม้าหอบเหนื่อย หายใจไม่ทัน นอนราบไม่ได้", age: 78, expect: "ควรปรึกษาหมอ (dyspnea red flags)" },
  { text: "เมื่อเช้าม้าลื่นล้มในห้องน้ำ หัวฟาดพื้น", age: 82, expect: "ควรปรึกษาหมอ (หกล้ม+หัวกระแทก)" },
  { text: "ม้าปัสสาวะแสบขัด มีไข้ หนาวสั่น ดูสับสน", age: 80, expect: "ควรปรึกษาหมอ (urosepsis)" },
  { text: "ม้าท้องเสียหลายรอบ อ่อนเพลีย ปากแห้ง", age: 79, expect: "ควรสังเกต/ปรึกษาหมอ (ขาดน้ำ)" },
  { text: "ขาซ้ายม้าบวมแดง ปวด กดเจ็บ", age: 75, expect: "ควรปรึกษาหมอ (DVT)" },
  { text: "ม้าพูดไม่ชัด ปากเบี้ยว แขนขวาอ่อนแรง", age: 76, expect: "ควรปรึกษาหมอ (stroke Class A)" },
  { text: "ม้าปวดเมื่อยตามตัวนิดหน่อย พักแล้วดีขึ้น", age: 78, expect: "ปกติ (ธรรมดา)" },
  { text: "ม้าปวดเข่าเรื้อรังเหมือนทุกวัน เดินได้ปกติ", age: 80, expect: "ปกติ (เรื้อรังคงที่)" },
];

for (const c of SCENARIOS) {
  console.log("\n" + "=".repeat(56));
  console.log(`"${c.text}" (อายุ ${c.age})\n  คาดหวัง: ${c.expect}`);
  let items;
  try { items = await organizeNarrative(c.text); }
  catch (e) { console.log("  ERROR:", e instanceof Error ? e.message : e); continue; }
  let maxKw = 0, maxUnion = 0;
  for (const it of items) {
    maxKw = Math.max(maxKw, bandToLv(observationBand(it.text, c.age, [])));
    maxUnion = Math.max(maxUnion, observationEscalationLevel(it.text, c.age, it.signs));
    console.log(`  [${it.category}] "${it.text}" sev=${it.severity} signs=[${it.signs.join(", ")}]`);
  }
  console.log(`  => keyword-only: ${LV[maxKw]} | keyword∪LLM: ${LV[maxUnion]}`);
}
console.log("\ndone");
