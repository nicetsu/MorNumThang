"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// Emergency shortcut. Client-side so it hides on the patient-switch screen (like the
// status chip) and follows soft navigation — the root-layout header renders once.
export function HeaderUrgent() {
  const pathname = usePathname();
  if (pathname.startsWith("/patients")) return null;

  return (
    <Link
      href="/urgent"
      aria-label="เกิดเรื่องแล้ว — ฉุกเฉิน"
      className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-red px-3 text-[14px] font-bold text-white active:scale-95"
    >
      <Plus aria-hidden className="size-4 shrink-0" />
      ฉุกเฉิน
    </Link>
  );
}
