import assert from "node:assert";
import { isAllergic } from "./allergy.ts";

const allergies = ["เพนิซิลลิน"];

// conflicting name flagged (exact + substring, case-insensitive)
assert.equal(isAllergic("เพนิซิลลิน", allergies), true);
assert.equal(isAllergic("เพนิซิลลิน 500mg", allergies), true);

// token match across parenthetical/dosage noise (the scan-flow bug):
// allergy "Cetirizine (เซทิริซีน)" vs med "Cetirizine 10 mg" must flag.
assert.equal(isAllergic("Cetirizine 10 mg", ["Cetirizine (เซทิริซีน)"]), true);
assert.equal(isAllergic("เซทิริซีน 10 มก", ["Cetirizine (เซทิริซีน)"]), true);
assert.equal(isAllergic("แอสไพริน 81 mg", ["แอสไพริน"]), true);

// safe name passes
assert.equal(isAllergic("พาราเซตามอล", allergies), false);
assert.equal(isAllergic("ยาความดัน", allergies), false);
// dosage/unit noise alone must never match (allergy "10 mg" is only noise → never blocks)
assert.equal(isAllergic("Cetirizine 10 mg", ["Amoxicillin 10 mg"]), false);

// empty allergy list never blocks
assert.equal(isAllergic("เพนิซิลลิน", []), false);
// blank allergy entries are ignored (don't match everything)
assert.equal(isAllergic("พาราเซตามอล", ["  "]), false);

console.log("allergy.test: ok");
