// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { CareEditor } from "@/components/care-editor";

// Care-guide edit (prototype screen 14).
export default async function GuideEdit() {
  const patient = await getActivePatient();

  return (
    <div className="space-y-4">
      <Link href="/guide" className="back-link">← คู่มือดูแลม้า</Link>
      <div>
        <p className="eyebrow">คู่มือดูแลม้า · ฉบับบ้านเรา</p>
        <h2 className="screen-title">อัปเดตวิธีดูแล</h2>
        <p className="lead">เขียนสิ่งที่ม้าทำได้ก่อน แล้วค่อยบอกวิธีช่วยให้สบายตัวค่ะ</p>
      </div>
      <CareEditor initial={patient?.careGuide ?? ""} />
    </div>
  );
}
