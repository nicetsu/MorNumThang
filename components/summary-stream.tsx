"use client";

import { useAiStream } from "@/lib/use-ai-stream";
import { AI_DISCLAIMER } from "@/lib/disclaimer";
import { ShareButton } from "@/components/share-button";

// The AI clinical-language panel (screen 5) — streams the doctor summary + share.
export function SummaryStream({ facts }: { facts: string }) {
  const { text, state, run } = useAiStream("summary");

  return (
    <div className="space-y-4">
      <button onClick={() => run()} disabled={state === "loading"} className="btn-primary">
        {state === "loading" ? "กำลังสรุป…" : state === "idle" ? "สร้างสรุปด้วย AI" : "สรุปใหม่อีกครั้ง"}
      </button>

      {state === "error" && (
        <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-red">
          สร้างสรุปไม่สำเร็จ ลองใหม่อีกครั้งนะคะ
        </p>
      )}

      {(text || state === "loading") && (
        <>
          <div className="translate-arrow text-center font-bold text-teal">
            AI ช่วยเรียบเรียง ↓
          </div>
          <article className="translation clinical-language">
            <small>สรุปให้หมอ</small>
            <p className="whitespace-pre-line">{text || "…"}</p>
          </article>
        </>
      )}

      {state === "done" && text && (
        <>
          <p className="handoff-hint">ยื่นจอนี้ให้พยาบาลได้เลยค่ะ</p>
          <ShareButton text={`${text}\n\n${facts}\n\n${AI_DISCLAIMER}`} label="แชร์สรุปให้หมอ" />
        </>
      )}
    </div>
  );
}
