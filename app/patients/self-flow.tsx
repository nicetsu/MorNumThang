import { ArrowRight, Check, Plus } from "lucide-react";
import { careForSelf } from "./actions";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/submit-button";
import { BackLink } from "@/components/back-link";

type Helper = { id: string; name: string | null; lineId: string };

export function SelfFlow({
  meName,
  accountLabel,
  inviteText,
  helpers,
  meActive,
}: {
  meName: string;
  accountLabel: string;
  inviteText: string;
  helpers: Helper[];
  meActive: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <BackLink fallback="/patients">กลับ</BackLink>
        <h2 className="screen-title">โปรไฟล์ของฉัน</h2>
        <p className="lead">แตะที่โปรไฟล์เพื่อเปิดสมุดของฉัน หรือเชิญคนมาช่วยดูแลได้ค่ะ</p>
      </div>

      <form action={careForSelf}>
        <SubmitButton
          className={`identity-card w-full text-left transition active:scale-[0.99] ${
            meActive ? "border-teal bg-teal-soft" : ""
          }`}
          pendingText="กำลังเปิดสมุด…"
        >
          <span className="avatar">{meName.trim().charAt(0) || "?"}</span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[21px]">{meName}</strong>
            <span className="my-0.5 block text-[16px] text-muted-foreground">{accountLabel}</span>
            <span className="flex items-center gap-1 text-sm font-bold text-teal">
              {meActive ? (
                <>กำลังเปิดสมุดของฉัน <Check aria-hidden className="size-[1em] shrink-0" /></>
              ) : (
                <>แตะเพื่อเปิดสมุดของฉัน <ArrowRight aria-hidden className="size-[1em] shrink-0" /></>
              )}
            </span>
          </span>
        </SubmitButton>
      </form>

        <ShareButton
          label={<span className="inline-flex items-center justify-center gap-1.5"><Plus aria-hidden className="size-[1.05em] shrink-0" />เชิญคนมาดูแลเรา</span>}
          text={inviteText}
          className="min-h-12 w-full rounded-xl border-2 border-teal py-3 font-bold text-teal"
        />

      <section className="people-section flex flex-col gap-2">
        <div className="section-heading !mb-0"><h3>คนที่ช่วยดูแลเรา</h3></div>
        {helpers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-4 text-muted-foreground">
            ยังไม่มีใครเข้าร่วม — ส่งลิงก์เชิญด้านบนได้เลยค่ะ
          </p>
        ) : (
          helpers.map((c) => (
            <div key={c.id} className="contact">
              <span className="person-avatar">{(c.name ?? c.lineId).trim().charAt(0)}</span>
              <span>
                <strong className="block">{c.name ?? c.lineId}</strong>
                <small className="text-muted-foreground">ช่วยดูแลคุณอยู่</small>
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
