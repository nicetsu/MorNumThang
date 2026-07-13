import { enterId } from "./actions";
import { LineLogin } from "./line-login";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

export default function EnterPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h2 className="screen-title">ยินดีต้อนรับค่ะ</h2>
        <p className="text-muted-foreground">
          เข้าสู่ระบบด้วย LINE เพื่อเข้าดูสมุดของผู้รับการดูแลที่คุณดูแล
          ครั้งหน้าเข้าด้วย LINE เดิมก็จะเจอข้อมูลเดิมค่ะ
        </p>
      </div>

      <LineLogin />

      {/* ponytail: code fallback — for testing outside the LINE app (localhost / plain browser). */}
      <details className="rounded-2xl border border-dashed border-line p-4">
        <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
          หรือเข้าด้วยรหัส (สำหรับทดสอบ)
        </summary>
        <form action={enterId} className="mt-3 space-y-3">
          <Input
            name="id"
            placeholder="รหัสของคุณ เช่น jiab หรือ 0812345678"
            className="bg-ivory"
          />
          <SubmitButton className="btn-primary" pendingText="กำลังเข้า…">เข้าสู่สมุด</SubmitButton>
          <p className="text-sm text-muted-foreground">
            อยากลองดูตัวอย่าง? ใช้รหัส <b className="text-teal">demo</b> ได้เลยค่ะ
          </p>
        </form>
      </details>
    </div>
  );
}
