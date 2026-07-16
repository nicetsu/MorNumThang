// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ensureSelfPatient, getUserId } from "@/lib/patient";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/submit-button";
import { careForSelf } from "@/app/patients/actions";

export default async function MePage() {
  const uid = (await getUserId())!;
  const me = await ensureSelfPatient(uid);
  const [user, caregivers] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: uid }, select: { name: true, lineId: true } }),
    db.patient.findUniqueOrThrow({
      where: { id: me.id },
      select: {
        caregivers: { select: { id: true, name: true, lineId: true }, orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const inviteText = `ช่วยกันดูแล${me.name}ในหมอนำทางนะคะ\n${base}/join/${me.inviteCode}`;

  // Others who help care for us (exclude ourselves — we're always connected as caregiver too).
  const helpers = caregivers.caregivers.filter((c) => c.id !== uid);

  return (
    <div className="space-y-6">
      <div className="section-heading">
        <h2 className="screen-title !mb-0">โปรไฟล์ของฉัน</h2>
        <Link href="/profile" className="!text-clay font-bold">โปรไฟล์ผู้รับการดูแล</Link>
      </div>

      <article className="identity-card">
        <div className="avatar">{(me.name ?? "?").trim().charAt(0) || "?"}</div>
        <div>
          <strong className="block text-[21px]">{me.name}</strong>
          <p className="my-0.5 text-[16px] text-muted-foreground">
            {user.name ?? user.lineId} · บัญชีของคุณ
          </p>
          <small className="block text-[16px] text-muted-foreground">
            แชร์ลิงก์ด้านล่าง เพื่อให้ญาติเข้ามาช่วยดูแลคุณได้ค่ะ
          </small>
        </div>
      </article>

      <section className="people-section space-y-3">
        <h3 className="section-heading">เชิญคนมาดูแลเรา</h3>
        <p className="text-muted-foreground">
          ส่งลิงก์ให้ลูกหรือญาติ — เขาจะเข้าช่วยดูสมุดสุขภาพของคุณได้ทันทีหลังเข้าระบบ
        </p>
        <ShareButton
          label="＋ เชิญคนมาดูแลเรา"
          text={inviteText}
          className="min-h-12 w-full rounded-xl border-2 border-teal py-3 font-bold text-teal"
        />
        <p className="break-all rounded-2xl border border-dashed border-line bg-ivory px-4 py-3 text-sm text-muted-foreground">
          {base}/join/{me.inviteCode}
        </p>
      </section>

      <section className="people-section">
        <h3 className="section-heading">คนที่ช่วยดูแลเรา</h3>
        {helpers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-4 text-muted-foreground">
            ยังไม่มีใครเข้าร่วม — ส่งลิงก์เชิญด้านบนได้เลยค่ะ
          </p>
        ) : (
          <div className="space-y-3">
            {helpers.map((c) => (
              <div key={c.id} className="contact">
                <span className="person-avatar">{(c.name ?? c.lineId).trim().charAt(0)}</span>
                <span>
                  <strong className="block">{c.name ?? c.lineId}</strong>
                  <small className="text-muted-foreground">ช่วยดูแลคุณอยู่</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <form action={careForSelf}>
        <SubmitButton className="btn-primary" pendingText="กำลังเปิด…">
          เปิดสมุดของฉัน
        </SubmitButton>
      </form>
    </div>
  );
}
