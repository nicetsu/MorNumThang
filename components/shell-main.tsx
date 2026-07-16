"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

// Role picker / login / invite landing — not inside a care-book session.
function hideNav(pathname: string) {
  return (
    pathname.startsWith("/patients") ||
    pathname.startsWith("/enter") ||
    pathname.startsWith("/join")
  );
}

export function ShellMain({
  hasPatient,
  children,
}: {
  hasPatient: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNav = hasPatient && !hideNav(pathname);

  return (
    <>
      <main className={`flex-1 px-5 pt-6 ${showNav ? "pb-nav" : "pb-6"}`}>{children}</main>
      {showNav && <BottomNav />}
    </>
  );
}
