import assert from "node:assert";
import { parseWeight } from "./weight.ts";

// valid
assert.equal(parseWeight("51.3"), 51.3);
assert.equal(parseWeight("70"), 70);

// invalid → throws
for (const bad of ["", "abc", "0", "-5", "500", null]) {
  assert.throws(() => parseWeight(bad), /ไม่ถูกต้อง/, `expected throw for ${bad}`);
}

console.log("weight.test: ok");
