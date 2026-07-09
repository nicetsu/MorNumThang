"use client";

import Link from "next/link";
import { useAiStream } from "@/lib/use-ai-stream";
import { AI_DISCLAIMER } from "@/lib/disclaimer";
import { ShareButton } from "@/components/share-button";

export default function Summary() {
  const { text, state, run } = useAiStream("summary");

  return (
    <div className="space-y-4 py-2">
      <Link href="/" className="inline-block font-bold text-teal">
        ← สมุดของม้า
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">สำหรับคุณหมอ</p>
        <h2 className="text-2xl font-extrabold text-teal">สรุปให้หมอ</h2>
      </div>

      <button
        onClick={() => run()}
        disabled={state === "loading"}
        className="w-full rounded-xl bg-teal py-3 text-lg font-bold text-white disabled:opacity-60"
      >
        {state === "loading" ? "กำลังสรุป…" : state === "idle" ? "สร้างสรุปด้วย AI" : "สรุปใหม่อีกครั้ง"}
      </button>

      {state === "error" && (
        <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-red">
          สร้างสรุปไม่สำเร็จ ลองใหม่อีกครั้งนะคะ
        </p>
      )}

      {(text || state === "loading") && (
        <article className="rounded-2xl border border-line bg-card p-5">
          <p className="whitespace-pre-line">{text || "…"}</p>
          {/* Disclaimer always renders under AI output (AGENTS.md rule 3). */}
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted-foreground">
            {AI_DISCLAIMER}
          </p>
        </article>
      )}

      {state === "done" && text && (
        <ShareButton text={`${text}\n\n${AI_DISCLAIMER}`} label="แชร์สรุปให้หมอ" />
      )}
    </div>
  );
}
