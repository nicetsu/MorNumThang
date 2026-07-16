import assert from "node:assert";
import { toWhenTimes } from "./meds.ts";

// วันละ 3 ครั้ง หลังอาหาร เช้า-กลางวัน-เย็น
assert.deepEqual(
  toWhenTimes("หลังอาหาร", ["เช้า", "กลางวัน", "เย็น"]),
  ["หลังอาหารเช้า", "หลังอาหารกลางวัน", "หลังอาหารเย็น"],
);

// ก่อนอาหาร เช้า-เย็น
assert.deepEqual(toWhenTimes("ก่อนอาหาร", ["เช้า", "เย็น"]), ["ก่อนอาหารเช้า", "ก่อนอาหารเย็น"]);

// ก่อนนอน has no before/after prefix
assert.deepEqual(toWhenTimes("หลังอาหาร", ["เย็น", "ก่อนนอน"]), ["หลังอาหารเย็น", "ก่อนนอน"]);

// ไม่ระบุ ก่อน/หลัง → default หลังอาหาร (พบบ่อยสุด)
assert.deepEqual(toWhenTimes("ไม่ระบุ", ["เช้า"]), ["หลังอาหารเช้า"]);

// No period marked → empty (caller falls back to ตามแพทย์สั่ง)
assert.deepEqual(toWhenTimes("หลังอาหาร", []), []);
assert.deepEqual(toWhenTimes("หลังอาหาร", undefined), []);

// Junk periods are ignored; dupes collapse
assert.deepEqual(toWhenTimes("หลังอาหาร", ["เช้า", "เช้า", "ตอนบ่าย"]), ["หลังอาหารเช้า"]);

console.log("meds.test: ok");
