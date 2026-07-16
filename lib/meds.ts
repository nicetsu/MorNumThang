// Meal-time slots a drug label can mark, and the deterministic mapping from the OCR'd
// (mealTiming, periods) → the form's ช่วงเวลา values (WHEN_OPTIONS in med-form.tsx).
// Prefill only — the caregiver reviews/edits before saving (AGENTS.md rule 2), never a
// recommendation. Deterministic so a wrong model read can't silently invent a schedule.

export const MEAL_PERIODS = ["เช้า", "กลางวัน", "เย็น", "ก่อนนอน"] as const;

// (mealTiming, marked periods) → whenTime values matching WHEN_OPTIONS. Empty when the
// label marked no period (caller falls back to "ตามแพทย์สั่ง").
export function toWhenTimes(mealTiming: string | undefined, periods: string[] | undefined): string[] {
  const valid = (periods ?? []).filter((p) => (MEAL_PERIODS as readonly string[]).includes(p));
  // ก่อนนอน carries no before/after; the three meals take the ก่อน/หลัง prefix.
  // ponytail: ไม่ระบุ → หลังอาหาร (พบบ่อยสุดบนฉลากไทย); ผู้ดูแลปรับได้ในฟอร์ม.
  const prefix = mealTiming === "ก่อนอาหาร" ? "ก่อนอาหาร" : "หลังอาหาร";
  const out: string[] = [];
  for (const p of valid) {
    const v = p === "ก่อนนอน" ? "ก่อนนอน" : `${prefix}${p}`;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
