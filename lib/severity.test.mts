import assert from "node:assert";
import { scoreLevel, severityBand } from "./severity.ts";

// band mapping: 0-3→1, 4-7→2, 8-10→3; null→2
assert.equal(severityBand(2), 1);
assert.equal(severityBand(6), 2);
assert.equal(severityBand(9), 3);
assert.equal(severityBand(null), 2);

// empty → 0 (ยังไม่มีข้อมูล)
assert.equal(scoreLevel([]), 0);

// plain average of bands, rounded
assert.equal(scoreLevel([2, 6, 9]), 2); // bands [1,2,3] → 2.0
assert.equal(scoreLevel([1, 2, 5]), 1); // bands [1,1,2] → 1.33 → 1

// floor: one red item must not be averaged away → at least Level 2
assert.equal(scoreLevel([1, 1, 1, 1, 9]), 2); // bands avg 1.4 → 1, floored to 2
assert.equal(scoreLevel([9]), 3); // avg already 3, floor doesn't lower it
// no red item → no floor, stays Level 1
assert.equal(scoreLevel([1, 1, 1]), 1);

console.log("severity.test: ok");
