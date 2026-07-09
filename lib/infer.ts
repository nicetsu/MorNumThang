// Deterministic symptom → SUSPECTED-disease heuristic (never a diagnosis, AGENTS.md rule 2).
// Only a "ชวนสังเกต" cue used to decide which rights/services to surface for the doctor.
// The LLM never does this inference — code does, and output is always framed as "อาจเกี่ยวข้อง".
//
// Disease names match how RecommendationRule.condition phrases them (e.g. "ผู้ป่วยเบาหวาน").

const DISEASE_CUES: { disease: string; keywords: string[] }[] = [
  {
    disease: "เบาหวาน",
    keywords: [
      "กินน้ำเยอะ", "กินน้ำมาก", "ดื่มน้ำเยอะ", "ดื่มน้ำมาก", "คอแห้ง",
      "ปัสสาวะบ่อย", "ฉี่บ่อย", "ตื่นเข้าห้องน้ำ", "ปัสสาวะกลางคืน",
      "น้ำหนักลด", "ผอมลง", "หิวบ่อย", "แผลหายช้า", "ชาปลายมือ", "ชาปลายเท้า", "ชามือชาเท้า",
    ],
  },
  {
    disease: "ความดันโลหิตสูง",
    keywords: ["ปวดหัว", "ปวดศีรษะ", "ปวดท้ายทอย", "เวียนหัว", "มึนหัว", "หน้ามืด", "ตาพร่า"],
  },
  {
    disease: "โรคหัวใจ",
    keywords: ["เหนื่อยง่าย", "ใจสั่น", "หอบ", "เจ็บหน้าอก", "แน่นหน้าอก", "บวมขา", "นอนราบไม่ได้"],
  },
  {
    disease: "โรคไต",
    keywords: ["ตัวบวม", "ขาบวม", "หน้าบวม", "ปัสสาวะน้อย", "ปัสสาวะเป็นฟอง"],
  },
];

// Return the distinct diseases whose symptom cues appear in the given texts.
export function inferSuspectedDiseases(texts: string[]): string[] {
  const blob = texts.join(" ").toLowerCase();
  const found = new Set<string>();
  for (const { disease, keywords } of DISEASE_CUES) {
    if (keywords.some((k) => blob.includes(k.toLowerCase()))) found.add(disease);
  }
  return [...found];
}
