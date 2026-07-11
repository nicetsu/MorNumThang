import { enterId } from "./actions";
import { Input } from "@/components/ui/input";

export default function EnterPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <h2 className="screen-title">ยินดีต้อนรับค่ะ</h2>
        <p className="text-muted-foreground">
          กรอกรหัสของคุณ (ชื่อเล่นหรือเบอร์โทรก็ได้) เพื่อเข้าดูสมุดของม้าที่คุณดูแล
          ครั้งหน้าใช้รหัสเดิมก็จะเจอข้อมูลเดิมค่ะ
        </p>
      </div>

      <form action={enterId} className="space-y-3">
        <Input
          name="id"
          required
          autoFocus
          placeholder="รหัสของคุณ เช่น jiab หรือ 0812345678"
          className="bg-ivory"
        />
        <button type="submit" className="btn-primary">เข้าสู่สมุด</button>
      </form>

      <p className="text-sm text-muted-foreground">
        อยากลองดูตัวอย่าง? ใช้รหัส <b className="text-teal">demo</b> ได้เลยค่ะ
      </p>
    </div>
  );
}
