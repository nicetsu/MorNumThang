"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Three top-level tabs, mirroring the prototype's bottom-nav (บันทึก / รักษา / โปรไฟล์).
const tabs = [
  { href: "/", label: "บันทึก" },
  { href: "/meds", label: "รักษา" },
  { href: "/profile", label: "โปรไฟล์" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูสมุด"
      className="sticky bottom-0 z-10 flex border-t border-line bg-paper"
    >
      {tabs.map((tab) => {
        // "/" only active on exact home; others active on their subtree.
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 py-4 text-center text-xl font-bold",
              active ? "text-teal" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
