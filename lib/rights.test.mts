import assert from "node:assert";
import { qualifies, recommendServices, facilityGuidance, type Rule } from "./rights.ts";

// Real rows from the RecommendationRules sheet.
const R = {
  general: { serviceName: "รักษาโรคทั่วไป", right: "ทุกสิทธิ", facility: "ทุกโรงพยาบาล", condition: "ทุกคน", category: "เวชกรรม" },
  extractTooth: { serviceName: "ถอนฟัน", right: "ทุกสิทธิ", facility: "ทุกโรงพยาบาล", condition: "ทุกคน", category: "ทันตกรรม" },
  adl: { serviceName: "ประเมิน ADL", right: "บัตรทอง", facility: "ทุกโรงพยาบาล", condition: "อายุ 60 ปีขึ้นไป", category: "คัดกรอง" },
  sugar: { serviceName: "ตรวจระดับน้ำตาล", right: "ทุกสิทธิ", facility: "ทุกโรงพยาบาล", condition: "อายุ 35 ปีขึ้นไป หรือ ผู้ป่วยเบาหวาน", category: "เทคนิคการแพทย์" },
  lipid: { serviceName: "ตรวจระดับไขมัน", right: "ทุกสิทธิ", facility: "ทุกโรงพยาบาล", condition: "อายุ 35 ปีขึ้นไป หรือ ผู้ป่วยไขมันในเลือดสูง", category: "เทคนิคการแพทย์" },
  antenatal: { serviceName: "ฝากครรภ์", right: "ทุกสิทธิ", facility: "โรงพยาบาลที่ลงทะเบียนไว้", condition: "หญิงตั้งครรภ์", category: "ฝากครรภ์" },
  hpv: { serviceName: "วัคซีน HPV", right: "ทุกสิทธิ", facility: "ทุกโรงพยาบาล", condition: "เด็กหญิง/หญิงไทย อายุ 11–20 ปี", category: "เทคนิคการแพทย์" },
  ssoOnly: { serviceName: "x", right: "ประกันสังคม", facility: "ทุกโรงพยาบาล", condition: "ทุกคน", category: "y" },
} satisfies Record<string, Rule>;

// Seeded patient: 74, บัตรทอง, ความดัน+เบาหวาน.
const maa = { coverage: "บัตรทอง", age: 74, diseases: "ความดันโลหิตสูง · เบาหวาน", hospital: "รพ.เจริญกรุงประชารักษ์" };
assert.equal(qualifies(R.general, maa), "yes");
assert.equal(qualifies(R.adl, maa), "yes", "60+ screening qualifies at 74");
assert.equal(qualifies(R.sugar, maa), "yes", "diabetic OR 35+");
assert.equal(qualifies(R.lipid, maa), "yes", "35+ half of the OR");
assert.equal(qualifies(R.antenatal, maa), "no", "pregnancy N/A for elderly");
assert.equal(qualifies(R.hpv, maa), "no", "age range 11–20 excludes 74");
assert.equal(qualifies(R.ssoOnly, maa), "no", "ประกันสังคม-only rule excludes บัตรทอง patient");

// MockUsers C003: 79, บัตรทอง, ปวดฟัน.
const c003 = { coverage: "บัตรทอง", age: 79, diseases: "ปวดฟัน" };
assert.equal(qualifies(R.extractTooth, c003), "yes", "dental available to all");
assert.equal(qualifies(R.adl, c003), "yes", "60+ at 79");

// MockUsers C001: 27, บัตรทอง, เบาหวาน — young diabetic still qualifies via the disease half.
const c001 = { coverage: "บัตรทอง", age: 27, diseases: "เบาหวาน" };
assert.equal(qualifies(R.sugar, c001), "yes", "diabetic qualifies below 35");
assert.equal(qualifies(R.adl, c001), "no", "60+ screening excludes 27");

// recommendServices drops "no" rules.
const recs = recommendServices(Object.values(R), maa);
assert.ok(recs.every((r) => r.match !== "no"));
assert.ok(!recs.some((r) => r.rule.serviceName === "ฝากครรภ์"));

// facilityGuidance
assert.match(facilityGuidance("โรงพยาบาลที่ลงทะเบียนไว้", "รพ.เจริญกรุง"), /รพ\.เจริญกรุง/);
assert.match(facilityGuidance("ทุกโรงพยาบาล", "รพ.เจริญกรุง"), /ทุกโรงพยาบาล/);

console.log("rights.test: ok");
