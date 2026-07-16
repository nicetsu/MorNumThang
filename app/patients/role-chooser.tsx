import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { logout } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export function RoleChooser({
  displayName,
  careCount,
  helperCount,
}: {
  displayName: string;
  careCount: number;
  helperCount: number;
}) {
  return (
    <div className="role-gate">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow !mb-0">สวัสดีค่ะ{displayName ? ` · ${displayName}` : ""}</p>
        <form action={logout}>
          <SubmitButton className="shrink-0 text-sm font-bold text-clay" pendingText="…">
            ออก
          </SubmitButton>
        </form>
      </div>

      <div className="role-pick">
        <Link href="/patients?role=care" className="role-card role-card--care">
          <strong>ฉันเป็นผู้ดูแล</strong>
          <span className="role-card__meta">
            {careCount > 0 ? `ดูแลอยู่ ${careCount} คน` : "เริ่มเพิ่มผู้รับการดูแล"}
          </span>
          <span className="role-card__go" aria-hidden>
            เลือก <ArrowRight aria-hidden className="inline size-[1em]" />
          </span>
        </Link>

        <Link href="/patients?role=self" className="role-card role-card--self">
          <strong>ฉันต้องการให้คนมาดูแล</strong>
          <span className="role-card__meta">
            {helperCount > 0 ? `มีคนช่วยดูแล ${helperCount} คน` : "ยังไม่มีผู้ดูแล — เชิญได้เลย"}
          </span>
          <span className="role-card__go" aria-hidden>
            เลือก <ArrowRight aria-hidden className="inline size-[1em]" />
          </span>
        </Link>
      </div>
    </div>
  );
}
