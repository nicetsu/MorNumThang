import Link from "next/link";
import { Plus } from "lucide-react";
import { getActivePatient, getUserId } from "@/lib/patient";
import { HeaderChip } from "@/components/header-chip";

// App chrome — single row: brand · emergency · status chip (tap to switch).
// Layout in utilities (the @layer components CSS was losing the cascade).
export async function AppHeader() {
  const [patient, uid] = await Promise.all([getActivePatient(), getUserId()]);
  const isSelf = !!patient && !!uid && patient.selfOfUserId === uid;
  const roleName = isSelf ? "สมุดของฉัน" : patient?.name;

  return (
    <header className="app-header sticky top-0 z-20 flex min-h-[56px] w-full items-center gap-2 border-b border-line bg-[color-mix(in_srgb,var(--ivory)_92%,transparent)] px-4 backdrop-blur-sm">
      <Link href="/" className="shrink-0 text-[19px] font-extrabold leading-none text-teal">
        หมอนำทาง
      </Link>

      <Link
        href="/urgent"
        aria-label="เกิดเรื่องแล้ว — ฉุกเฉิน"
        className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-red px-3 text-[14px] font-bold text-white active:scale-95"
      >
        <Plus aria-hidden className="size-4 shrink-0" />
        ฉุกเฉิน
      </Link>

      {patient && <HeaderChip roleName={roleName!} isSelf={isSelf} />}
    </header>
  );
}
