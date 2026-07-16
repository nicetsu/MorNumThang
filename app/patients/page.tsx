// ponytail: per-request read — the patient list can change (create/select).
export const dynamic = "force-dynamic";

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { PID_COOKIE, ensureSelfPatient, getUserId } from "@/lib/patient";
import { selectPatient, createPatient, careForSelf, logout } from "./actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { ShareButton } from "@/components/share-button";

export default async function PatientsPage() {
  const uid = (await getUserId())!; // middleware guarantees a value here
  const [user, patients, activeId, me] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: uid } }),
    db.patient.findMany({
      where: { caregivers: { some: { id: uid } } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        age: true,
        coverage: true,
        selfOfUserId: true,
      },
    }),
    cookies().then((c) => c.get(PID_COOKIE)?.value),
    ensureSelfPatient(uid),
  ]);

  // คนที่ฉันช่วยดูแล ≠ โปรไฟล์ตัวเอง
  const others = patients.filter((p) => p.id !== me.id);
  const helpers = await db.patient.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      caregivers: {
        where: { id: { not: uid } },
        select: { id: true, name: true, lineId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const inviteText = `ช่วยกันดูแล${me.name}ในหมอนำทางนะคะ\n${base}/join/${me.inviteCode}`;
  const meActive = activeId === me.id;

  return (
    <div className="space-y-8">
      {/* ── 1. บัญชี + เชิญคนมาดูแลเรา ── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="screen-title !mb-0">โปรไฟล์ของฉัน</h2>
          <form action={logout}>
            <SubmitButton className="shrink-0 text-sm font-bold text-clay" pendingText="กำลังออก…">
              ออกจากระบบ
            </SubmitButton>
          </form>
        </div>

        <article className="identity-card">
          <div className="avatar">{(me.name ?? "?").trim().charAt(0) || "?"}</div>
          <div>
            <strong className="block text-[21px]">{me.name}</strong>
            <p className="my-0.5 text-[16px] text-muted-foreground">
              {user.name ?? user.lineId}
            </p>
          </div>
        </article>

        <div className="space-y-3">
          <h3 className="section-heading">เชิญคนมาดูแลเรา</h3>
          <p className="text-muted-foreground">
            ส่งลิงก์ให้ลูกหรือญาติ — เขาจะเข้าช่วยดูสมุดสุขภาพของคุณได้หลังเข้าระบบ
          </p>
          <ShareButton
            label="＋ เชิญคนมาดูแลเรา"
            text={inviteText}
            className="min-h-12 w-full rounded-xl border-2 border-teal py-3 font-bold text-teal"
          />
        </div>

        {helpers.caregivers.length > 0 && (
          <div className="space-y-3">
            <h3 className="section-heading">คนที่ช่วยดูแลเรา</h3>
            {helpers.caregivers.map((c) => (
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

        <form action={careForSelf}>
          <SubmitButton
            className={
              meActive
                ? "flex w-full items-center justify-center gap-2 rounded-2xl border border-teal bg-teal-soft p-4 font-bold text-teal"
                : "btn-primary"
            }
            pendingText="กำลังเปิด…"
          >
            {meActive ? "กำลังเปิดสมุดของฉัน ✓" : "เปิดสมุดของฉัน"}
          </SubmitButton>
        </form>
      </section>

      {/* ── 2. คนที่ฉันช่วยดูแล ── */}
      <section className="space-y-4">
        <h2 className="screen-title !mb-0">คนที่ฉันช่วยดูแล</h2>
        <p className="text-muted-foreground">
          {others.length
            ? "แตะที่ชื่อเพื่อเข้าดูสมุดของท่านนั้นค่ะ"
            : "ยังไม่มีผู้รับการดูแล — เพิ่มคนด้านล่าง หรือรอรับลิงก์เชิญจากเขาได้ค่ะ"}
        </p>

        <div className="space-y-3">
          {others.map((p) => (
            <form key={p.id} action={selectPatient.bind(null, p.id)}>
              <SubmitButton
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                  p.id === activeId ? "border-teal bg-teal-soft" : "border-line bg-card"
                }`}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal text-xl font-extrabold text-white">
                  {p.name.replace(/^(แม่|พ่อ)/, "").trim().charAt(0) || "ม"}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-lg">{p.name}</strong>
                  <span className="text-sm text-muted-foreground">
                    {[p.age ? `${p.age} ปี` : null, p.coverage].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูล"}
                  </span>
                </span>
                {p.id === activeId && <span className="ml-auto font-bold text-teal">กำลังดูแล ✓</span>}
              </SubmitButton>
            </form>
          ))}
        </div>
      </section>

      {/* ── 3. เพิ่มผู้รับการดูแลคนใหม่ ── */}
      <section className="space-y-3 rounded-2xl border border-dashed border-line p-5">
        <strong className="block text-teal">เพิ่มผู้รับการดูแลคนใหม่</strong>
        <p className="text-sm text-muted-foreground">สำหรับคนที่คุณจะเป็นผู้ดูแลหลัก</p>
        <form action={createPatient} className="space-y-3">
          <Input name="name" required placeholder="ชื่อ เช่น แม่สมทรง ใจดี" className="bg-ivory" />
          <Input name="age" type="number" min={0} max={130} placeholder="อายุ (ไม่บังคับ)" className="bg-ivory" />
          <SubmitButton className="btn-primary" pendingText="กำลังเพิ่ม…">
            ＋ เพิ่มแล้วเริ่มดูแล
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
