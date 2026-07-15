export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getUserId } from "@/lib/patient";
import { LineLogin } from "@/app/enter/line-login";
import { enterId } from "@/app/enter/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { joinAsCaregiver } from "../actions";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const patient = await db.patient.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, caregivers: { select: { id: true } } },
  });

  if (!patient) {
    return (
      <div className="space-y-3 py-8">
        <h2 className="screen-title">ลิงก์ไม่ถูกต้อง</h2>
        <p className="text-muted-foreground">ลิงก์เชิญนี้อาจหมดอายุหรือพิมพ์ผิดค่ะ ลองขอลิงก์ใหม่จากคนที่เชิญนะคะ</p>
      </div>
    );
  }

  const uid = await getUserId();
  const already = uid ? patient.caregivers.some((c) => c.id === uid) : false;

  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h2 className="screen-title">ชวนมาช่วยดูแล</h2>
        <p className="text-muted-foreground">
          คุณได้รับเชิญให้ช่วยดูแล <b className="text-teal">{patient.name}</b> ในหมอนำทาง
        </p>
      </div>

      {already ? (
        <p className="rounded-2xl border border-teal bg-teal-soft p-4 font-bold text-teal">
          คุณช่วยดูแล {patient.name} อยู่แล้วค่ะ — เปิดสมุดได้จากหน้าแรกเลย
        </p>
      ) : uid ? (
        <form action={joinAsCaregiver.bind(null, code)}>
          <SubmitButton className="btn-primary" pendingText="กำลังเข้าร่วม…">
            ยืนยัน เข้าช่วยดูแล {patient.name}
          </SubmitButton>
        </form>
      ) : (
        <>
          <p className="text-muted-foreground">เข้าสู่ระบบก่อน แล้วจะเข้ามาช่วยดูแลได้เลยค่ะ</p>
          <LineLogin redirectTo={`/join/${code}`} />

          <details className="rounded-2xl border border-dashed border-line p-4">
            <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
              หรือเข้าด้วยชื่อของคุณ
            </summary>
            <form action={enterId} className="mt-3 space-y-3">
              <input type="hidden" name="redirectTo" value={`/join/${code}`} />
              <Input
                name="id"
                placeholder="ชื่อหรือรหัสของคุณ เช่น jiab หรือ 0812345678"
                className="bg-ivory"
              />
              <SubmitButton className="btn-primary" pendingText="กำลังเข้า…">
                เข้าช่วยดูแล {patient.name}
              </SubmitButton>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
