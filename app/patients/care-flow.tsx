import { Check, Plus } from "lucide-react";
import { selectPatient, createPatient } from "./actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { BackLink } from "@/components/back-link";

type Person = {
  id: string;
  name: string;
  age: number | null;
  coverage: string | null;
};

export function CareFlow({
  others,
  activeId,
}: {
  others: Person[];
  activeId: string | undefined;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <BackLink href="/patients">เปลี่ยนบทบาท</BackLink>
        <h2 className="screen-title">คนที่ฉันช่วยดูแล</h2>
        <p className="lead">
          {others.length
            ? "แตะที่ชื่อเพื่อเข้าดูสมุดของท่านนั้นค่ะ"
            : "ยังไม่มีผู้รับการดูแล — เพิ่มคนด้านล่าง หรือรอรับลิงก์เชิญจากเขาได้ค่ะ"}
        </p>
      </div>

      <div className="space-y-3">
        {others.map((p) => (
          <form key={p.id} action={selectPatient.bind(null, p.id)}>
            <SubmitButton
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                p.id === activeId ? "border-teal bg-teal-soft" : "border-line bg-card"
              }`}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal text-xl font-extrabold text-white">
                {p.name.replace(/^(แม่|พ่อ)/, "").trim().charAt(0) || "ม"}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-lg">{p.name}</strong>
                <span className="text-sm text-muted-foreground">
                  {[p.age ? `${p.age} ปี` : null, p.coverage].filter(Boolean).join(" · ") ||
                    "ยังไม่มีข้อมูล"}
                </span>
              </span>
              {p.id === activeId && (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-teal">กำลังดูแล <Check aria-hidden className="size-[1em] shrink-0" /></span>
              )}
            </SubmitButton>
          </form>
        ))}
      </div>

      <section className="rounded-2xl border border-dashed border-line bg-card/60 p-5 space-y-3">
        <strong className="block text-teal">เพิ่มผู้รับการดูแลคนใหม่</strong>
        <p className="text-sm text-muted-foreground">สำหรับคนที่คุณจะเป็นผู้ดูแลหลัก</p>
        <form action={createPatient} className="space-y-3">
          <Input name="name" required placeholder="ชื่อ เช่น แม่สมทรง ใจดี" className="bg-ivory" />
          <Input
            name="age"
            type="number"
            min={0}
            max={130}
            placeholder="อายุ (ไม่บังคับ)"
            className="bg-ivory"
          />
          <SubmitButton className="btn-primary" pendingText="กำลังเพิ่ม…">
            <span className="inline-flex items-center justify-center gap-1.5">
              <Plus aria-hidden className="size-[1.05em] shrink-0" />
              เพิ่มแล้วเริ่มดูแล
            </span>
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
