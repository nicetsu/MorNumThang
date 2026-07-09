// Deterministic medication-safety check. The LLM never gates this (AGENTS.md rule 2).
// Ported from the prototype's isAllergic(): case-insensitive substring match.
export function isAllergic(name: string, allergies: string[]): boolean {
  const n = name.toLowerCase();
  return allergies.some((a) => a.trim() && n.includes(a.trim().toLowerCase()));
}

// Fixed pick-list from the prototype.
export const MED_OPTIONS = [
  "ยาความดัน",
  "แอสไพริน",
  "ยาลดไขมัน",
  "ยาละลายลิ่มเลือด",
  "พาราเซตามอล",
  "เพนิซิลลิน",
  "ยาแก้อักเสบ (NSAIDs)",
];
