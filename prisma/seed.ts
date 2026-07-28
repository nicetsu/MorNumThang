import { readFileSync } from "node:fs";
import { PrismaClient } from "../app/generated/prisma/client";
import { pgAdapter } from "../lib/db";

const prisma = new PrismaClient({ adapter: pgAdapter() });

// Health-rights reference data, converted from the spreadsheet by scripts/import_rights.py.
type RightsData = {
  rights: { id: string; name: string; eligibleUsers: string; facility: string; monthlyCost: string; coverageLevel: string }[];
  services: { id: string; name: string; category: string }[];
  agencies: { id: string; name: string; responsibility: string }[];
  facilities: { id: string; code: string; name: string; district: string; type: string; lat: number | null; lng: number | null }[];
  rules: { serviceName: string; right: string; facility: string; condition: string; category: string }[];
  docs: { service: string; docs: string }[];
};

// ponytail: one deep demo patient (richer than several shallow mocks) — good for exercising
// the doctor-score / signals / meds / appointments views end-to-end with realistic data.
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function seedPatient() {
  // The demo ผู้ดูแล — everyone entering the code "demo" logs in as this user.
  const demo = await prisma.user.upsert({ where: { lineId: "demo" }, update: {}, create: { lineId: "demo" } });
  const owns = { connect: { id: demo.id } };

  let patient = await prisma.patient.findFirst({ where: { name: "สมชาย ใจดี" } });
  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: "สมชาย ใจดี",
        age: 76,
        coverage: "บัตรทอง",
        hospital: "รพ.เจริญกรุงประชารักษ์",
        job: "อดีตข้าราชการ",
        likes: "ชอบปลูกต้นไม้และฟังวิทยุ",
        caregiver: "แนน · ลูกสาว",
        diseases: "ความดันโลหิตสูง · เบาหวาน",
        allergies: { create: [{ name: "เพนิซิลลิน" }] },
        caregivers: owns,
      },
    });
  }
  return patient;
}

// น้ำหนัก/สัญญาณชีพย้อนหลัง 15 วัน — แนวโน้มลดลงต่อเนื่อง ~5% (เข้าเกณฑ์ weightTrendLevel
// → doctor-score "ควรสังเกต" สีเหลือง แบบ deterministic ไม่ต้องพึ่ง severity เลย). ค่าความดัน/
// ชีพจร/อุณหภูมิ/SpO2 ยังอยู่ในเกณฑ์ปกติทั้งหมด (ไม่ให้ NEWS2 ดันเป็นแดง) — ไม่ใช่ทุกครั้งจะมี
// vitals ครบ (เลียนแบบการใช้งานจริง).
async function seedWeights(patientId: string) {
  if ((await prisma.weightLog.count({ where: { patientId } })) > 0) return;
  const rows = [
    { d: 15, kg: 70.8, systolic: 138, diastolic: 86, pulse: 78, temp: 36.6, spo2: 97, note: "ชั่งตอนเช้าหลังตื่นนอน" },
    { d: 12, kg: 70.5, note: "" },
    { d: 10, kg: 70.1, systolic: 142, diastolic: 88, pulse: 80, temp: 36.7, spo2: 97, note: "" },
    { d: 8, kg: 69.4, note: "" },
    { d: 6, kg: 68.8, systolic: 144, diastolic: 90, pulse: 82, temp: 36.7, spo2: 96, note: "น้ำหนักลดลงต่อเนื่องมาสักพักแล้ว" },
    { d: 4, kg: 68.0, note: "" },
    { d: 2, kg: 67.2, systolic: 140, diastolic: 87, pulse: 80, temp: 36.6, spo2: 97, note: "" },
    { d: 1, kg: 66.9, note: "ยังลดลงเรื่อย ๆ เริ่มเป็นห่วง" },
  ];
  await prisma.weightLog.createMany({
    data: rows.map((r) => ({
      patientId,
      kg: r.kg,
      systolic: r.systolic ?? null,
      diastolic: r.diastolic ?? null,
      pulse: r.pulse ?? null,
      temp: r.temp ?? null,
      spo2: r.spo2 ?? null,
      note: r.note || null,
      at: daysAgo(r.d),
    })),
  });
}

// ยาที่กินอยู่ — มื้อที่กินวันละหลายครั้งแยกเป็นคนละแถว (เหมือนที่ addMedication() ทำจริง
// เมื่อบันทึกยาแบบหลายมื้อ) ให้ตรงกับโรคที่ seed ไว้ (ความดัน + เบาหวาน).
async function seedMeds(patientId: string) {
  if ((await prisma.medication.count({ where: { patientId } })) > 0) return;
  await prisma.medication.createMany({
    data: [
      { patientId, name: "ยาความดัน", dose: 1, perDay: 1, whenTime: "หลังอาหารเช้า", remaining: 18 },
      { patientId, name: "ยาเบาหวาน", dose: 1, perDay: 2, whenTime: "หลังอาหารเช้า", remaining: 12 },
      { patientId, name: "ยาเบาหวาน", dose: 1, perDay: 2, whenTime: "หลังอาหารเย็น", remaining: 12 },
      { patientId, name: "ยาบำรุงกระดูก (แคลเซียม)", dose: 1, perDay: 1, whenTime: "หลังอาหารเย็น", remaining: 25 },
    ],
  });
}

// นัดหมอ — 1 นัดที่ผ่านมาแล้ว (done) + 1 นัดที่ยังไม่ถึง.
async function seedAppointments(patientId: string) {
  if ((await prisma.appointment.count({ where: { patientId } })) > 0) return;
  await prisma.appointment.createMany({
    data: [
      { patientId, at: daysAgo(20), place: "รพ.เจริญกรุงประชารักษ์", note: "ตรวจน้ำตาลและความดันประจำเดือน", done: true },
      { patientId, at: daysFromNow(9), place: "รพ.เจริญกรุงประชารักษ์", note: "ตรวจน้ำตาลและความดันประจำเดือน", done: false },
    ],
  });
}

// บันทึกอาการ/เรื่องเล่า — ประโยคยาวแบบที่ผู้ดูแลจริงพิมพ์ ไม่ใช่คำสั้น ๆ ห้วน ๆ ย้อนหลัง 15 วัน
// ตั้งใจให้จุดในไทม์ไลน์มีครบ 3 สี (เขียว/เหลือง/แดง) — แต่ "แดง" (severity 8-10) ทั้งคู่อยู่ที่
// วันที่ 8-9 ซึ่งเลย 7 วันไปแล้ว จึงไม่ถูกนับใน recentSeverityLevel() หรือ /signals (ดูเฉพาะ 7
// วันล่าสุด — lib/risk.ts) ทำให้ doctor-score ของ "7 วันนี้" ยังเป็น "ควรสังเกต" สีเหลืองเหมือนเดิม
// แม้ในไทม์ไลน์รวมจะเห็นจุดแดงก็ตาม. ช่วง 1-7 วัน (ที่มีผลต่อคะแนน) คุมไว้ที่ severity 4-7 เท่านั้น.
async function seedObservations(patientId: string) {
  if ((await prisma.observation.count({ where: { patientId } })) > 0) return;
  const rows: { d: number; category: string; text: string; severity: number }[] = [
    {
      d: 15,
      category: "การเดิน",
      text: "พาคุณพ่อเดินไปตลาดตอนเช้าเหมือนเคย เดินได้ไกลพอสมควร ก้าวเดินมั่นคงดี ไม่มีอะไรผิดปกติให้เห็นเลย อารมณ์ดีตลอดทางเดินกลับบ้านด้วย",
      severity: 2,
    },
    {
      d: 13,
      category: "อารมณ์",
      text: "วันนี้คุณพ่ออารมณ์ดีเป็นพิเศษ เล่นกับหลานทั้งบ่าย หัวเราะบ่อย พูดคุยเล่าเรื่องเก่า ๆ สมัยยังทำงานราชการให้ฟังอย่างมีความสุข ดูสดชื่นแจ่มใสมาก",
      severity: 2,
    },
    {
      d: 10,
      category: "การกิน",
      text: "คุณพ่อทานข้าวได้ปกติดี หมดจานทั้งมื้อเช้าและมื้อเที่ยง ดูมีความอยากอาหารตามปกติเหมือนทุกวัน ไม่มีอะไรน่าเป็นห่วงในวันนี้เลย",
      severity: 3,
    },
    {
      // นอกหน้าต่าง 7 วัน (>7) — จุดแดงในไทม์ไลน์ที่ไม่กระทบคะแนนรวม 7 วันปัจจุบัน
      d: 9,
      category: "การเดิน",
      text: "เมื่อวานตอนอาบน้ำคุณพ่อเซไปข้างหนึ่งเกือบเสียหลักในห้องน้ำ โชคดีที่จับราวทันไว้ได้ แต่หลังจากนั้นบ่นปวดสะโพกข้างขวาอยู่พักใหญ่กว่าจะทุเลาลง เลยรีบพาไปให้หมอตรวจดูอาการทันที",
      severity: 8,
    },
    {
      d: 8,
      category: "ยา",
      text: "ช่วงเช้าคุณพ่อดูงงและตอบคำถามช้ากว่าปกติมากหลังกินยาความดันตัวใหม่ที่หมอเพิ่งปรับให้เมื่อนัดครั้งก่อน เลยรีบโทรปรึกษาเภสัชกรที่ร้านยาใกล้บ้านและงดยามื้อถัดไปไว้ก่อนจนกว่าจะได้คุยกับหมอ",
      severity: 8,
    },
    {
      d: 6,
      category: "ยา",
      text: "สังเกตว่าคุณพ่อลืมกินยาเบาหวานมื้อเย็นไปสองวันติดต่อกัน เพราะเผลอเข้านอนก่อนถึงเวลาที่ตั้งไว้ เลยตั้งเตือนในมือถือเพิ่มให้ ต้องคอยเช็คให้กินยาให้ตรงเวลามากขึ้นกว่านี้",
      severity: 5,
    },
    {
      d: 4,
      category: "การกิน",
      text: "วันนี้คุณพ่อทานข้าวได้น้อยมากอีกแล้ว มื้อเช้ากับมื้อเที่ยงแทบไม่แตะเลย ขอแค่น้ำเปล่ากับผลไม้นิดหน่อยแทน เป็นแบบนี้ติดต่อกันมาหลายวันแล้วเลยเริ่มเป็นห่วงมากขึ้น",
      severity: 6,
    },
    {
      d: 2,
      category: "อื่น ๆ",
      text: "เมื่อวานคุณพ่อบ่นว่าเวียนหัวเล็กน้อยตอนลุกขึ้นยืนเร็ว ๆ นั่งพักสักครู่อาการก็ดีขึ้นเป็นปกติ แต่เกิดขึ้นสองครั้งในวันเดียวเลยเริ่มกังวลอยู่บ้าง อยากให้หมอช่วยดูตอนไปนัดครั้งหน้า",
      severity: 7,
    },
    {
      d: 1,
      category: "ยา",
      text: "คุณพ่อยังทานข้าวได้ไม่เท่าปกติ แถมวันนี้กินยาความดันช้าไปเกือบสองชั่วโมงเพราะตื่นสาย เลยกังวลว่าจะกระทบกับตัวเลขความดันที่วัดได้ช่วงนี้ด้วย จะคอยจับตาดูใกล้ ๆ ต่อไป",
      severity: 6,
    },
    {
      d: 0,
      category: "เรื่องดี",
      text: "ตรวจน้ำตาลปลายนิ้วที่บ้านเช้านี้ได้ 118 ถือว่าอยู่ในเกณฑ์ดีกว่าที่คิดไว้เยอะ คุณพ่อดีใจมากที่เห็นตัวเลขลดลงจากเดือนก่อน บอกว่าจะพยายามคุมอาหารแบบนี้ต่อไป",
      severity: 1,
    },
  ];
  await prisma.observation.createMany({
    data: rows.map((r) => ({ patientId, category: r.category, text: r.text, severity: r.severity, at: daysAgo(r.d) })),
  });
}

async function seedRecords(patientId: string) {
  await seedWeights(patientId);
  await seedMeds(patientId);
  await seedAppointments(patientId);
  await seedObservations(patientId);
}

// Pick-list for the เพิ่มยา dropdown — generic names an elderly-care caregiver would
// recognize, ported from the prototype's MED_OPTIONS (lib/allergy.ts, now removed as
// dead code) plus a few more common categories seen in the seeded patients' diseases.
const DRUGS: { name: string; category: string }[] = [
  { name: "ยาความดัน", category: "หัวใจและหลอดเลือด" },
  { name: "ยาเบาหวาน", category: "เบาหวาน" },
  { name: "แอสไพริน", category: "หัวใจและหลอดเลือด" },
  { name: "ยาลดไขมัน", category: "หัวใจและหลอดเลือด" },
  { name: "ยาละลายลิ่มเลือด", category: "หัวใจและหลอดเลือด" },
  { name: "พาราเซตามอล", category: "แก้ปวดลดไข้" },
  { name: "เพนิซิลลิน", category: "ยาปฏิชีวนะ" },
  { name: "ยาแก้อักเสบ (NSAIDs)", category: "แก้ปวดลดอักเสบ" },
  { name: "ยาลดกรดในกระเพาะ", category: "ระบบทางเดินอาหาร" },
  { name: "ยาบำรุงกระดูก (แคลเซียม)", category: "กระดูกและข้อ" },
  { name: "ยาแก้แพ้", category: "ภูมิแพ้" },
  { name: "ยาระบาย", category: "ระบบขับถ่าย" },
];

// ponytail: plain skipDuplicates upsert — same idempotent shape as the rights tables below.
async function seedDrugs() {
  await prisma.drug.createMany({ data: DRUGS, skipDuplicates: true });
}

// Re-run scripts/import_rights.py then `db seed` to refresh when the sheet updates.
async function seedRights() {
  const d: RightsData = JSON.parse(readFileSync(new URL("./rights-data.json", import.meta.url), "utf-8"));
  // String-id tables (R001/S001/A001/F001…): skipDuplicates adds only new rows, so a
  // sheet update (e.g. the 30 new facilities) flows in on re-seed without wiping the rest.
  await prisma.healthRight.createMany({ data: d.rights, skipDuplicates: true });
  await prisma.service.createMany({ data: d.services, skipDuplicates: true });
  await prisma.agency.createMany({ data: d.agencies, skipDuplicates: true });
  await prisma.facility.createMany({ data: d.facilities, skipDuplicates: true });
  // Autoincrement PKs — skipDuplicates can't dedupe by content, so guard against re-insert.
  if ((await prisma.recommendationRule.count()) === 0) await prisma.recommendationRule.createMany({ data: d.rules });
  if ((await prisma.requiredDoc.count()) === 0) await prisma.requiredDoc.createMany({ data: d.docs });
}

// ponytail: one seeded patient ("ผู้รับการดูแล") with a full record set + the health-rights
// reference tables.
async function main() {
  const patient = await seedPatient();
  await seedRecords(patient.id);
  await seedDrugs();
  await seedRights();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
