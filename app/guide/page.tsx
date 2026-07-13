// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";

// Care-guide view (prototype screen 19). Edit lives on /guide/edit (screen 14).
export default async function Guide() {
  const patient = await getActivePatient();
  // Strip lightweight markdown an AI draft may have left behind.
  const guide = (patient?.careGuide ?? "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*\*\s+/gm, "• ")
    .trim();

  return (
    <div className="space-y-4">
      <Link href="/meds" className="back-link">← รักษา</Link>
      <div>
        <p className="eyebrow">คู่มือดูแลผู้รับการดูแล · ฉบับบ้านเรา</p>
        <h2 className="screen-title">คู่มือดูแลผู้รับการดูแล</h2>
        <p className="lead">สิ่งที่ผู้รับการดูแลทำได้ และวิธีช่วยให้สบายตัว</p>
      </div>

      <article className="care-guide">
        <div className="section-heading">
          <h3>วิธีดูแลตอนนี้</h3>
          <Link href="/guide/edit">แก้ไข</Link>
        </div>
        {guide ? (
          <p className="whitespace-pre-line text-[#5E5647]">{guide}</p>
        ) : (
          <p className="text-[#76500E]">
            ยังไม่มีคู่มือดูแล แตะ “แก้ไข” เพื่อเขียนวิธีดูแลผู้รับการดูแล หรือให้ AI ช่วยร่างค่ะ
          </p>
        )}
      </article>
    </div>
  );
}
