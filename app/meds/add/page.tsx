// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getActivePatient } from "@/lib/patient";
import { BackLink } from "@/components/back-link";
import { removeAllergy } from "../list/actions";
import { AllergyForm } from "./allergy-form";
import { MedAddTabs } from "./med-add-tabs";

// Add-medication screen (prototype screen 8): allergy field + the med form.
export default async function MedAdd() {
  const patient = await getActivePatient();
  if (!patient) {
    return <p className="py-8 text-muted-foreground">ยังไม่มีข้อมูลผู้รับการดูแลค่ะ</p>;
  }
  const [allergies, drugRows] = await Promise.all([
    db.allergy.findMany({ where: { patientId: patient.id }, orderBy: { name: "asc" } }),
    db.drug.findMany({ orderBy: { name: "asc" } }),
  ]);
  const drugs = drugRows.map((d) => d.name);

  return (
    <div className="space-y-6">
      <BackLink fallback="/meds/list">← กลับ</BackLink>
      <div>
        <p className="eyebrow">เพิ่มเข้ารายการยา</p>
        <h2 className="screen-title">จดยาที่ใช้อยู่</h2>
        <p className="lead">จดตามฉลากหรือรายการยาที่ได้รับมานะคะ</p>
      </div>

      <section>
        <h3 className="section-heading">ยาที่แพ้</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {allergies.length === 0 ? (
            <p className="text-muted-foreground">ยังไม่มีข้อมูลยาที่แพ้</p>
          ) : (
            allergies.map((a) => (
              <form key={a.id} action={removeAllergy}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="allergy-chip" aria-label={`ลบ ${a.name}`}>
                  {a.name}
                  <span aria-hidden className="grid size-[22px] place-items-center rounded-full bg-[rgba(200,62,62,.15)]">×</span>
                </button>
              </form>
            ))
          )}
        </div>
        <AllergyForm drugs={drugs} />
        <p className="allergy-note mt-3">
          <span>!</span> ยาที่แพ้จะถูกล็อกไว้ในรายการ เลือกไม่ได้เพื่อความปลอดภัย
        </p>
      </section>

      <MedAddTabs allergies={allergies.map((a) => a.name)} drugs={drugs} />
    </div>
  );
}
