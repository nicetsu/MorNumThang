"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

// The active-patient chip in the header. Client-side so its visibility follows
// soft navigation — the root-layout header renders once, so a server `headers()`
// path check would go stale and the chip wouldn't hide on /patients.
export function HeaderChip({ roleName, isSelf }: { roleName: string; isSelf: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/patients")) return null;

  return (
    <Link
      href="/patients"
      aria-label={`กำลังดูแล ${roleName} — แตะเพื่อเปลี่ยน`}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[14px] font-extrabold ${
        isSelf ? "bg-amber-soft text-[#8a5a12]" : "bg-teal-soft text-teal-dark"
      }`}
    >
      <span>{roleName}</span>
      <ArrowLeftRight aria-hidden className="size-4 shrink-0 opacity-70" />
    </Link>
  );
}
