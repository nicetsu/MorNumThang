// Deterministic health-rights eligibility. The LLM never gates this (AGENTS.md rule 2),
// same shape as isAllergic() in lib/allergy.ts. Given a citizen's สิทธิ + อายุ + โรค,
// decide which RecommendationRule rows they qualify for.

export type Rule = {
  serviceName: string;
  right: string; // "ทุกสิทธิ" | "บัตรทอง" | full scheme name …
  facility: string;
  condition: string; // free Thai text
  category: string;
};

export type PatientFacts = {
  coverage?: string | null; // e.g. "บัตรทอง"
  age?: number | null;
  diseases?: string | null; // "·"-separated free text
};

export type Match = "yes" | "maybe" | "no";

// Which scheme keyword a rule's `right` implies. Rules use the short name ("บัตรทอง")
// while Patient.coverage may hold the short or full name — match on the short keyword.
const RIGHT_ALIASES: Record<string, string[]> = {
  บัตรทอง: ["บัตรทอง", "หลักประกันสุขภาพ", "สปสช"],
  ประกันสังคม: ["ประกันสังคม"],
  ข้าราชการ: ["ข้าราชการ"],
  ท้องถิ่น: ["ท้องถิ่น"],
};

function rightMatches(ruleRight: string, coverage?: string | null): boolean {
  if (ruleRight.includes("ทุกสิทธิ")) return true;
  if (!coverage) return false;
  const cov = coverage.toLowerCase();
  // Find the scheme the rule targets, then check the patient's coverage names it.
  for (const [scheme, aliases] of Object.entries(RIGHT_ALIASES)) {
    if (ruleRight.includes(scheme)) {
      return aliases.some((a) => cov.includes(a.toLowerCase()));
    }
  }
  // Unknown scheme string — fall back to a direct substring test.
  return cov.includes(ruleRight.toLowerCase());
}

// Conditions that don't apply to an elderly patient (pregnancy / newborn / child).
const NOT_ELDERLY = ["ตั้งครรภ์", "แรกเกิด", "หลังคลอด", "ทารก", "เด็ก", "มารดา", "ชั่วโมงหลังคลอด"];

// Evaluate one clause (already split off any "หรือ"). Returns yes/no, or maybe if unparsed.
function evalClause(clause: string, p: PatientFacts): Match {
  const c = clause.trim();
  if (!c || c.includes("ทุกคน")) return "yes";

  // "อายุ N ปีขึ้นไป" → age >= N
  const min = c.match(/อายุ\s*(\d+)\s*ปีขึ้นไป/);
  if (min) return p.age != null && p.age >= Number(min[1]) ? "yes" : "no";

  // "อายุ A–B ปี" (en-dash, em-dash, hyphen) → A <= age <= B
  const range = c.match(/อายุ\s*(\d+)\s*[–—-]\s*(\d+)\s*ปี/);
  if (range) {
    if (p.age == null) return "no";
    return p.age >= Number(range[1]) && p.age <= Number(range[2]) ? "yes" : "no";
  }

  // Disease-gated: "ผู้ป่วยเบาหวาน", "ผู้ป่วยไขมันในเลือดสูง", … (Thai block U+0E00–U+0E7F)
  const sick = c.match(/ผู้ป่วย([฀-๿]+)/);
  if (sick) return p.diseases && p.diseases.includes(sick[1]) ? "yes" : "no";

  // Clearly not an elderly patient's concern.
  if (NOT_ELDERLY.some((k) => c.includes(k))) return "no";

  // ponytail: naive Thai parser — unrecognised clauses are flagged, never guessed.
  return "maybe";
}

// "หรือ" joins alternatives (age OR disease): qualify if any clause qualifies.
function conditionMatches(condition: string, p: PatientFacts): Match {
  const parts = condition.split("หรือ");
  const results = parts.map((part) => evalClause(part, p));
  if (results.includes("yes")) return "yes";
  if (results.includes("maybe")) return "maybe";
  return "no";
}

// A rule qualifies "yes" only if BOTH right and condition are yes; a right mismatch is "no".
export function qualifies(rule: Rule, p: PatientFacts): Match {
  if (!rightMatches(rule.right, p.coverage)) return "no";
  return conditionMatches(rule.condition, p);
}

export type Recommendation = { rule: Rule; match: Match };

// All qualifying rules (yes + maybe), dropping outright "no". Order preserved.
export function recommendServices(rules: Rule[], p: PatientFacts): Recommendation[] {
  return rules
    .map((rule) => ({ rule, match: qualifies(rule, p) }))
    .filter((r) => r.match !== "no");
}

// Turn a rule's facility column into guidance for this patient.
export function facilityGuidance(ruleFacility: string, hospital?: string | null): string {
  if (ruleFacility.includes("ลงทะเบียน")) {
    return hospital ? `ไปที่ ${hospital} (โรงพยาบาลตามสิทธิ)` : "ไปที่โรงพยาบาลที่ลงทะเบียนสิทธิไว้";
  }
  return "ไปได้ทุกโรงพยาบาลตามสิทธิ";
}

// --- Inline suggestion direction (home/record/treatment card) ---
// Deterministic gate + direction only (AGENTS.md rule 2). The AI writes the actual
// wording tailored to the current symptom; it never decides eligibility or direction.
//   "free-med": a minor current symptom (in the 32-list) → รับยาที่ร้านยา
//   "doctor":   status is severe → พบแพทย์โดยใช้สิทธิ
//   null:       nothing worth surfacing right now
// level: 3 = ควรปรึกษาหมอ, 2 = ควรสังเกต, 0-1 = สบายดี.
export function rightsDirection(
  level: 0 | 1 | 2 | 3,
  freeMedSymptom: string | null,
): "free-med" | "doctor" | null {
  if (level >= 3) return "doctor";
  if (level === 2) return freeMedSymptom ? "free-med" : null;
  return null;
}
