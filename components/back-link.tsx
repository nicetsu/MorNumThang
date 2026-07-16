"use client";

import { useRouter } from "next/navigation";

// Goes back in history (so a page reached from several places returns to wherever you
// came from), falling back to a fixed route when there's no history (direct load/refresh).
export function BackLink({ fallback, children }: { fallback: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-link"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      {children}
    </button>
  );
}
