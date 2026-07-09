// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { CareEditor } from "@/components/care-editor";

export default async function Guide() {
  const patient = await db.patient.findFirst();

  return (
    <div className="space-y-4 py-2">
      <Link href="/meds" className="inline-block font-bold text-teal">
        ← รักษา
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">คู่มือดูแลม้า · ฉบับบ้านเรา</p>
        <h2 className="text-2xl font-extrabold text-teal">คู่มือดูแลม้า</h2>
        <p className="text-muted-foreground">สิ่งที่ม้าทำได้ และวิธีช่วยให้สบายตัว</p>
      </div>
      <CareEditor initial={patient?.careGuide ?? ""} />
    </div>
  );
}