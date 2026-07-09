import assert from "node:assert";
import { isAllergic } from "./allergy.ts";

const allergies = ["เพนิซิลลิน"];

// conflicting name flagged (exact + substring, case-insensitive)
assert.equal(isAllergic("เพนิซิลลิน", allergies), true);
assert.equal(isAllergic("เพนิซิลลิน 500mg", allergies), true);

// safe name passes
assert.equal(isAllergic("พาราเซตามอล", allergies), false);
assert.equal(isAllergic("ยาความดัน", allergies), false);

// empty allergy list never blocks
assert.equal(isAllergic("เพนิซิลลิน", []), false);
// blank allergy entries are ignored (don't match everything)
assert.equal(isAllergic("พาราเซตามอล", ["  "]), false);

console.log("allergy.test: ok");
