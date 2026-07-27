// Deterministic medication-safety check. The LLM never gates this (AGENTS.md rule 2).
// Ported from the prototype's isAllergic(), hardened for real-world names: an allergy
// saved as "Cetirizine (เซทิริซีน)" must still match a med saved as "Cetirizine 10 mg".
// Plain substring both-ways misses that, so we also compare on meaningful name tokens.
// Safety bias: prefer over-flagging (false positive) to missing a real allergy.

// Noise tokens that must never trigger a match: dosage units + generic words.
const NOISE = new Set([
  "mg", "ml", "mcg", "g", "gm", "tab", "tabs", "cap", "caps",
  "เม็ด", "มก", "มล", "มิลลิกรัม", "ยา", "ชนิด", "เม็ดยา",
]);

// Split a drug/allergy string into comparable name tokens: drop parens, dosage
// numbers, and unit/generic noise. e.g. "Cetirizine (เซทิริซีน) 10 mg" -> ["cetirizine","เซทิริซีน"].
function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[()[\]]/g, " ")
    .split(/[\s·,/.+-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !/\d/.test(t) && !NOISE.has(t));
}

export function isAllergic(name: string, allergies: string[]): boolean {
  const medLower = name.toLowerCase();
  const medTokens = nameTokens(name);
  return allergies.some((a) => {
    const al = a.trim().toLowerCase();
    if (!al) return false;
    if (medLower.includes(al)) return true; // original substring match (unchanged behavior)
    // Any meaningful allergy token appearing in the med name (or its tokens) is a conflict.
    return nameTokens(a).some((t) => medLower.includes(t) || medTokens.includes(t));
  });
}
