// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { recommendServices, facilityGuidance, type Rule } from "@/lib/rights";

// Reference data changes (the source sheet notes 1–3-month cycles) — always say so, and
// point at the responsible agency. This is deterministic guidance, not a medical opinion.
const RIGHTS_DISCLAIMER =
  "ข้อมูลสิทธิอาจเปลี่ยนแปลงตามนโยบายรัฐ · โปรดตรวจสอบกับโรงพยาบาลตามสิทธิหรือหน่วยงานที่ดูแลก่อนใช้บริการ";

export default async function RightsNavigator() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลม้าค่ะ</p>;
  }

  const [rules, rights, docs, agencies] = await Promise.all([
    db.recommendationRule.findMany(),
    db.healthRight.findMany(),
    db.requiredDoc.findMany(),
    db.agency.findMany(),
  ]);

  const recs = recommendServices(rules as Rule[], patient);
  const eligible = recs.filter((r) => r.match === "yes");
  const maybe = recs.filter((r) => r.match === "maybe");

  // The patient's scheme + who to contact, matched by the coverage keyword ("บัตรทอง").
  const cov = patient.coverage ?? "";
  const scheme = cov ? rights.find((r) => r.name.includes(cov)) : undefined;
  const agency = cov ? agencies.find((a) => a.responsibility.includes(cov)) : undefined;

  // Documents to bring, matched loosely by service name (only a few docs exist).
  const docsFor = (serviceName: string) =>
    docs.find((d) => serviceName.includes(d.service) || d.service.includes(serviceName))?.docs;

  // Group eligible services by category for a scannable list.
  const byCategory = new Map<string, typeof eligible>();
  for (const r of eligible) {
    const list = byCategory.get(r.rule.category) ?? [];
    list.push(r);
    byCategory.set(r.rule.category, list);
  }

  return (
    <div className="space-y-4">
      <Link href="/profile" className="back-link">← โปรไฟล์</Link>
      <div>
        <p className="eyebrow">สิทธิการรักษาของม้า</p>
        <h2 className="screen-title">สิทธิของม้า</h2>
        <p className="lead">ม้ามีสิทธิรักษาอะไรบ้าง ไปที่ไหน และต้องเตรียมเอกสารอะไร</p>
      </div>

      {/* Scheme summary card */}
      <article className="identity-card">
        <div className="avatar">สิทธิ</div>
        <div>
          <strong className="block text-[19px]">{scheme?.name ?? patient.coverage ?? "ยังไม่ได้ระบุสิทธิ"}</strong>
          {scheme && (
            <p className="my-0.5 text-[15px] text-muted-foreground">
              ความคุ้มครอง: {scheme.coverageLevel} · ค่าใช้จ่าย: {scheme.monthlyCost === "0" ? "ไม่มี" : scheme.monthlyCost}
            </p>
          )}
          {patient.hospital && <small className="block text-[15px] text-muted-foreground">โรงพยาบาลตามสิทธิ: {patient.hospital}</small>}
        </div>
      </article>

      {byCategory.size === 0 ? (
        <p className="rounded-[18px] border border-dashed border-line p-6 text-center text-muted-foreground">
          ยังจับคู่สิทธิไม่ได้ — ลองระบุสิทธิและอายุของม้าในโปรไฟล์
        </p>
      ) : (
        [...byCategory.entries()].map(([category, list]) => (
          <section key={category}>
            <div className="section-heading">
              <h3>{category}</h3>
            </div>
            <div className="space-y-2">
              {list.map(({ rule }) => {
                const bring = docsFor(rule.serviceName);
                return (
                  <article key={rule.serviceName + rule.condition} className="list-card">
                    <span className="pill-icon">✓</span>
                    <div>
                      <strong>{rule.serviceName}</strong>
                      <small>{facilityGuidance(rule.facility, patient.hospital)}</small>
                      {bring && <small>เอกสารที่ต้องเตรียม: {bring}</small>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {maybe.length > 0 && (
        <section>
          <div className="section-heading">
            <h3>อาจเข้าเงื่อนไข</h3>
          </div>
          <p className="text-[14px] text-muted-foreground">บริการเหล่านี้มีเงื่อนไขเฉพาะ — สอบถามโรงพยาบาลเพื่อยืนยันสิทธิ</p>
          <div className="space-y-2 mt-2">
            {maybe.map(({ rule }) => (
              <article key={rule.serviceName + rule.condition} className="list-card">
                <span className="pill-icon">?</span>
                <div>
                  <strong>{rule.serviceName}</strong>
                  <small>เงื่อนไข: {rule.condition}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {agency && (
        <section className="people-section">
          <h3 className="section-heading">หน่วยงานที่ดูแลสิทธิ</h3>
          <div className="contact">
            <span className="person-avatar pro">{agency.name.trim().charAt(0)}</span>
            <span>
              <strong className="block">{agency.name}</strong>
              <small className="text-muted-foreground">{agency.responsibility}</small>
            </span>
          </div>
        </section>
      )}

      <Link href="/rights/all" className="block text-center !text-clay font-bold py-2">ดูสิทธิและบริการทั้งหมด →</Link>

      <p className="safety-line mt-2">{RIGHTS_DISCLAIMER}</p>
    </div>
  );
}
