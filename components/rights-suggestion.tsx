"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAiStream } from "@/lib/use-ai-stream";

// Small, muted inline สิทธิ hint. AI writes one sentence tailored to the current อาการ +
// สิทธิ (e.g. "ปวดท้อง + บัตรทอง → รับยาฟรีที่ร้านยาได้เลย"); the direction is decided in code
// (lib/rights.ts, AGENTS.md rule 2). Renders nothing when there's nothing to advise or on error.
export function RightsSuggestion() {
  const { text, state, run } = useAiStream("rights");

  useEffect(() => {
    run();
  }, [run]);

  // Nothing to advise (empty stream) or a failure → stay out of the way.
  if (state === "error") return null;
  if (state === "done" && !text.trim()) return null;
  if (state === "idle") return null;

  const clean = text.replace(/\*\*/g, "").trim();

  return (
    <Link
      href="/rights"
      className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] text-muted-foreground"
    >
      <span aria-hidden className="text-[15px] leading-5">💡</span>
      <span className="min-w-0 flex-1 leading-snug">
        {state === "loading" && !clean ? (
          <span className="text-muted-foreground/70">กำลังดูสิทธิที่ใช้ได้…</span>
        ) : (
          <>
            {clean}
            <span className="mt-0.5 block text-[13px] font-bold text-teal">ดูสิทธิทั้งหมด →</span>
          </>
        )}
      </span>
    </Link>
  );
}
