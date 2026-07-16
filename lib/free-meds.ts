// สิทธิ "เจ็บป่วยเล็กน้อย 32 อาการ" — รับยาฟรีที่ร้านยาคุณภาพที่เข้าร่วม (สิทธิบัตรทอง/สปสช.).
// Static list from the spreadsheet's Medicine sheet — a fixed NHSO benefit, so a
// constant beats a DB table (no migration, no query). Re-check against the sheet if it grows.
// ponytail: static reference list; move to DB only if it needs per-patient editing.
export const FREE_MED_RIGHT = "บัตรทอง";
export const FREE_MED_FACILITY = "ร้านยาคุณภาพที่เข้าร่วม (สปสช.)";

export const FREE_MED_SYMPTOMS = [
  "เวียนศีรษะ", "ปวดหัว", "ปวดข้อ/ปวดกล้ามเนื้อ", "ปวดฟัน", "ปวดประจำเดือน", "ปวดท้อง",
  "ท้องเสีย", "ท้องผูก/ริดสีดวงทวาร", "ปัสสาวะแสบขัด", "ตกขาว", "แผล", "ผื่นผิวหนัง",
  "อาการทางตา", "อาการทางหู", "ไข้ ไอ เจ็บคอ", "ติดเชื้อโควิด", "น้ำมูก คัดจมูก",
  "มีแผลในปาก", "ตุ่มน้ำใสที่ปาก", "แผลน้ำร้อนลวกไม่รุนแรง", "อาการคันผิวหนัง/ศีรษะ",
  "อาการจากพยาธิ", "อาการจากหิด เหา", "ฝี หนองที่ผิวหนัง", "อาการชา/เหน็บชา",
  "อาการนอนไม่หลับ", "เมารถ เมาเรือ", "เบื่ออาหารโดยไม่มีโรคร่วม", "คลื่นไส้ อาเจียน",
  "อาการแพ้ยา/แพ้อาหารเล็กน้อย/แมลงกัดต่อย", "อาการเจ็บป่วยจากการสูบบุหรี่", "เหงือกอักเสบ/มีกลิ่นปาก",
] as const;

// Does the patient's สิทธิ include the free-med benefit? Only บัตรทอง/สปสช. does.
export function hasFreeMedRight(coverage?: string | null): boolean {
  if (!coverage) return false;
  const c = coverage.toLowerCase();
  return c.includes("บัตรทอง") || c.includes("หลักประกัน") || c.includes("สปสช");
}

// Which free-med symptom (if any) the caregiver's notes mention — deterministic keyword hint.
// Names the symptom for the suggestion; the AI does the fuzzier read on top of this.
// ponytail: naive substring match on each symptom (and its "/"-separated alternatives).
export function matchFreeMedSymptom(texts: string[]): string | null {
  const blob = texts.join(" ");
  for (const s of FREE_MED_SYMPTOMS) {
    for (const alt of s.split("/")) {
      const key = alt.trim();
      if (key.length >= 3 && blob.includes(key)) return s;
    }
  }
  return null;
}
