// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { ShareButton } from "@/components/share-button";

export default async function Profile() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }

  // Latest vitals come from the most recent body-measurement log.
  const latest = await db.weightLog.findFirst({
    where: { patientId: patient.id },
    orderBy: { at: "desc" },
  });

  // Invite link for relatives — absolute URL so it's tappable when shared to LINE.
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const inviteText = `ช่วยกันดูแล${patient.name}ในหมอนำทางนะคะ\n${base}/join/${patient.inviteCode}`;

  return (
    <div className="space-y-6">
      <div className="section-heading">
        <h2 className="screen-title !mb-0">โปรไฟล์</h2>
        <Link href="/profile/edit" className="!text-clay font-bold">แก้ไข</Link>
      </div>

      <article className="identity-card">
        <div className="avatar">{(patient.name ?? "?").trim().charAt(0) || "?"}</div>
        <div>
          <strong className="block text-[21px]">
            {patient.name}{patient.age ? ` · ${patient.age} ปี` : ""}
          </strong>
          {(patient.coverage || patient.hospital) && (
            <p className="my-0.5 text-[16px] text-muted-foreground">
              {[patient.coverage, patient.hospital].filter(Boolean).join(" · ")}
            </p>
          )}
          {patient.likes && <small className="block text-[16px] text-muted-foreground">{patient.likes}</small>}
          {patient.job && <small className="block text-[16px] text-muted-foreground">อาชีพ: {patient.job}</small>}
        </div>
      </article>

      {/* Latest vitals */}
      <div className="vitals">
        <article>
          <small>น้ำหนัก</small>
          <strong>{latest?.kg ?? "—"}</strong>
          <em>กก.</em>
        </article>
        <article>
          <small>ความดัน</small>
          <strong>{latest?.systolic && latest?.diastolic ? `${latest.systolic}/${latest.diastolic}` : "—"}</strong>
          <em>มม.ปรอท</em>
        </article>
        <article>
          <small>ชีพจร</small>
          <strong>{latest?.pulse ?? "—"}</strong>
          <em>ครั้ง/นาที</em>
        </article>
      </div>

      <Link
        href="/rights"
        className="flex items-center justify-between rounded-[18px] bg-teal px-5 py-4 font-bold text-white"
      >
        <span>ดูสิทธิการรักษาของผู้รับการดูแล</span>
        <span aria-hidden>→</span>
      </Link>

      {patient.diseases && (
        <section>
          <h3 className="section-heading">โรคประจำตัว</h3>
          <p className="card">{patient.diseases}</p>
        </section>
      )}

      <section className="people-section">
        <h3 className="section-heading">คนดูแล</h3>
        <div className="contact">
          <span className="person-avatar">{(patient.caregiver ?? "?").trim().charAt(0)}</span>
          <span>
            <strong className="block">{patient.caregiver ?? "ยังไม่ได้ระบุคนดูแล"}</strong>
            <small className="text-muted-foreground">อัปเดตสมุดของผู้รับการดูแล</small>
          </span>
          <b className="self-center rounded-lg bg-teal px-4 py-2 font-bold text-white">โทร</b>
        </div>
        <ShareButton
          label="＋ เชิญญาติมาช่วยดูแล"
          text={inviteText}
          className="mt-3 min-h-12 w-full rounded-xl border-2 border-teal py-3 font-bold text-teal"
        />
      </section>

      {patient.hospital && (
        <section className="people-section">
          <h3 className="section-heading">โรงพยาบาลในสิทธิ์</h3>
          <div className="contact">
            <span className="person-avatar pro">รพ.</span>
            <span>
              <strong className="block">{patient.hospital}</strong>
              <small className="text-muted-foreground">โรงพยาบาลตามสิทธิ์{patient.coverage ? ` · ${patient.coverage}` : ""}</small>
            </span>
            <b className="self-center rounded-lg bg-teal px-4 py-2 font-bold text-white">โทร</b>
          </div>
        </section>
      )}
    </div>
  );
}
