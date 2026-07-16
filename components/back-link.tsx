"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Back link with a leading arrow icon. Two modes:
//  - href:     plain navigation to a fixed route (most screens).
//  - fallback: go back in history so a page reached from several places returns to
//              wherever you came from, falling back to the route on a direct load.
export function BackLink({
  href,
  fallback,
  children,
}: {
  href?: string;
  fallback?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const cls = "back-link inline-flex items-center gap-1";
  const inner = (
    <>
      <ArrowLeft aria-hidden className="size-[1.05em] shrink-0" />
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else if (fallback) router.push(fallback);
      }}
    >
      {inner}
    </button>
  );
}
