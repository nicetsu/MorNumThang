"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Three top-level tabs, mirroring the prototype's bottom-nav (บันทึก / รักษา / โปรไฟล์).
const tabs = [
  { href: "/", label: "บันทึก" },
  { href: "/meds", label: "รักษา" },
  { href: "/profile", label: "โปรไฟล์" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูสมุด" className="bottom-nav">
      {tabs.map((tab) => {
        // "/" only active on exact home; others active on their subtree.
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
