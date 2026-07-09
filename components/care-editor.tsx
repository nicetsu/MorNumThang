"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAiStream } from "@/lib/use-ai-stream";
import { AI_DISCLAIMER } from "@/lib/disclaimer";
import { saveCareGuide } from "@/app/guide/actions";

// §4.3 — AI drafts care-guide bullets INTO the textarea; caregiver edits before saving.
// Never auto-saved.
export function CareEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const { state, run } = useAiStream("care");
  const suggested = state !== "idle";
  const router = useRouter();

  return (
    <form
      action={async (fd) => {
        await saveCareGuide(fd);
        toast.success("บันทึกคู่มือดูแลแล้ว");
        router.push("/guide");
      }}
      className="space-y-3"
    >
      <button
        type="button"
        onClick={() => run((full) => setValue(full))}
        disabled={state === "loading"}
        className="btn-outline disabled:opacity-60"
      >
        {state === "loading" ? "กำลังร่างคำแนะนำ…" : "ขอคำแนะนำจาก AI"}
      </button>

      {suggested && (
        <p className="rounded-xl bg-amber-soft px-3 py-2 text-sm text-muted-foreground">
          นี่คือร่างจาก AI — แก้ไขให้เหมาะกับม้าก่อนบันทึกได้เลยค่ะ · {AI_DISCLAIMER}
        </p>
      )}

      <textarea
        name="careGuide"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="สิ่งที่ม้าทำได้ และวิธีช่วยให้สบายตัว…"
        className="w-full rounded-xl border border-line bg-ivory px-4 py-3"
      />

      <button type="submit" className="btn-primary">
        บันทึกคู่มือ
      </button>
    </form>
  );
}
