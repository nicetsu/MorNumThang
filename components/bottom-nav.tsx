"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Three top-level tabs, mirroring the prototype's bottom-nav (บันทึก / รักษา / โปรไฟล์).
const tabs = [
  { href: "/", label: "บันทึก", prefixes: ["/logs", "/signals", "/calendar", "/summary", "/urgent"] },
  { href: "/meds", label: "รักษา", prefixes: ["/appointments", "/guide"] },
  { href: "/profile", label: "โปรไฟล์", prefixes: ["/rights"] },
] as const;

function isActive(pathname: string, href: string, prefixes: readonly string[]) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูสมุด" className="bottom-nav">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href, tab.prefixes);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
