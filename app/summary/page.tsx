// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { AI_DISCLAIMER } from "@/lib/disclaimer";
import { SummaryStream } from "@/components/summary-stream";

// Doctor summary (prototype screen 5): AI clinical panel + medical facts card.
export default async function Summary() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }
  const allergies = await db.allergy.findMany({ where: { patientId: patient.id } });
  const allergyText = allergies.length ? allergies.map((a) => a.name).join(", ") : "ไม่มีข้อมูลการแพ้ยา";
  const coverage = [patient.coverage, patient.hospital].filter(Boolean).join(" · ") || "ไม่มีข้อมูลสิทธิ์";

  const facts = `โรคประจำตัว: ${patient.diseases ?? "-"} · แพ้ยา: ${allergyText} · สิทธิ์: ${coverage}`;

  return (
    <div className="space-y-4">
      <Link href="/" className="back-link">← สมุดของผู้รับการดูแล</Link>
      <div>
        <p className="eyebrow">จากภาษาที่บ้านเล่า</p>
        <h2 className="screen-title">สรุปให้หมอ</h2>
        <p className="lead">เรื่องที่บ้านช่วยกันจด จัดเป็นภาษาที่หมออ่านต่อได้</p>
      </div>

      <SummaryStream facts={facts} />

      {/* Deterministic medical facts (not from the LLM). */}
      <article className="medical-facts">
        <div>
          <small>โรคประจำตัว</small>
          <strong>{patient.diseases ?? "-"}</strong>
        </div>
        <div>
          <small>แพ้ยา</small>
          <strong>{allergyText}</strong>
        </div>
        <div>
          <small>สิทธิ์</small>
          <strong>{coverage}</strong>
        </div>
      </article>

      <p className="safety-line">
        {AI_DISCLAIMER} · กรุณาตรวจคำให้ถูกก่อนแชร์ทุกครั้ง
      </p>
    </div>
  );
}
