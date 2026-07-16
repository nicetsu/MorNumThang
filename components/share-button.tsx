"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";

// Web Share API where available (mobile), clipboard fallback everywhere else.
export function ShareButton({
  text,
  label,
  className,
  disabled,
}: {
  text: string;
  label: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("คัดลอกข้อความแล้ว เปิด LINE แล้ววางได้เลยค่ะ");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={disabled}
      className={
        className ??
        "min-h-12 w-full rounded-xl bg-clay py-3 text-lg font-bold text-white disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}
