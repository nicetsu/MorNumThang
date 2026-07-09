"use client";

import { useEffect } from "react";
import { useAiStream } from "@/lib/use-ai-stream";
import { AI_DISCLAIMER } from "@/lib/disclaimer";

// §4.2 — surfaces recurring concerns from real logs. "ชวนสังเกต ไม่ใช่การวินิจฉัย".
export function HealthSignals() {
  const { text, state, run } = useAiStream("signals");

  useEffect(() => {
    run();
  }, [run]);

  if (state === "error") return null; // ponytail: signals are optional, fail quietly.

  return (
    <section className="rounded-2xl border border-line bg-amber-soft p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-amber px-2 py-0.5 text-sm font-bold text-white">เอ๊ะ</span>
        <h3 className="font-bold">AI ชวนสังเกต</h3>
      </div>
      <p className="whitespace-pre-line">
        {state === "loading" && !text ? "กำลังดูแนวโน้มจากบันทึก…" : text}
      </p>
      {text && (
        <p className="mt-3 border-t border-line pt-2 text-xs text-muted-foreground">
          {AI_DISCLAIMER}
        </p>
      )}
    </section>
  );
}
