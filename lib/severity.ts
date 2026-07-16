// Severity 0-10 → color band. 0-3 เขียว, 4-7 เหลือง, 8-10 แดง. (AGENTS.md: ชวนสังเกต ไม่ใช่วินิจฉัย)
export function severityBand(s: number | null | undefined): 1 | 2 | 3 {
  const v = typeof s === "number" ? s : 5; // null (เก่า) → กลาง
  return v >= 8 ? 3 : v >= 4 ? 2 : 1;
}

// Timeline dot class for an observation's severity.
export function dotClass(s: number | null | undefined): "green" | "amber" | "red" {
  const b = severityBand(s);
  return b === 3 ? "red" : b === 2 ? "amber" : "green";
}

// Doctor-score level 0-3 = average band across recent observations (0 = ยังไม่มีข้อมูล).
// Floor: one red item (band 3, severity 8–10) must not be averaged away by many mild
// ones — force at least Level 2 ("ควรสังเกต") whenever any recent observation is red.
export function scoreLevel(severities: (number | null)[]): 0 | 1 | 2 | 3 {
  if (severities.length === 0) return 0;
  const bands = severities.map(severityBand);
  const avg = Math.round(bands.reduce((sum, b) => sum + b, 0) / bands.length);
  const floor = bands.includes(3) ? 2 : 1;
  return Math.max(avg, floor) as 1 | 2 | 3;
}

// Box color + copy per level. 0 white, 1 green, 2 yellow, 3 orange.
export const LEVEL: Record<
  0 | 1 | 2 | 3,
  { badge: string; label: string; cls: string }
> = {
  0: { badge: "ยังไม่มีข้อมูล", label: "ยังไม่มีบันทึกให้วิเคราะห์", cls: "lvl-0" },
  1: { badge: "ดูแลได้ดี", label: "ระดับ 1 จาก 3 — สบายดี", cls: "lvl-1" },
  2: { badge: "ควรสังเกต", label: "ระดับ 2 จาก 3 — ปานกลาง", cls: "lvl-2" },
  3: { badge: "ควรปรึกษาหมอ", label: "ระดับ 3 จาก 3 — ควรใส่ใจ", cls: "lvl-3" },
};
