"use client";

import { useRef, useState } from "react";
import { toWhenTimes } from "@/lib/meds";

export type ScannedLabel = {
  name: string;
  quantity: string;
  usage: string;
  mealTiming: string;
  times: string[];
  rawText?: string;
  disclaimer?: string;
};

// Camera → OpenCV/PaddleOCR → Qwen (server-side, see app/api/meds/scan/route.ts).
// Only reads the label; nothing is saved until the caregiver reviews it in the form.
export function ScanForm({ onUse }: { onUse: (label: ScannedLabel) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedLabel | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/meds/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "อ่านรูปไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
      else setResult(data);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-teal/30 bg-teal-soft/30 p-4 text-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="ฉลากยาที่ถ่าย" className="mx-auto max-h-64 rounded-xl object-contain" />
        ) : (
          <p className="py-6 text-sm text-muted-foreground">ถ่ายรูปฉลากยาให้เห็นชื่อยาและวิธีใช้ชัด ๆ นะคะ</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-xl border border-teal/40 bg-white px-4 text-sm font-bold text-teal"
          >
            {preview ? "ถ่ายใหม่" : "ถ่ายรูปฉลากยา"}
          </button>
          {file && (
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="btn-primary min-h-11 px-4 text-sm disabled:opacity-60"
            >
              {loading ? "กำลังอ่าน…" : "วิเคราะห์รูป"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="allergy-note">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
          <p className="font-extrabold text-teal">ผลจากการอ่านฉลาก</p>
          <div className="space-y-2 text-sm">
            <p>
              <b>ชื่อยา</b>
              <br />
              {result.name || "— ไม่พบ —"}
            </p>
            <p>
              <b>จำนวน</b>
              <br />
              {result.quantity || "— ไม่พบ —"}
            </p>
            <p>
              <b>วิธีใช้</b>
              <br />
              {result.usage || "— ไม่พบ —"}
            </p>
            <p>
              <b>ก่อน/หลังอาหาร</b>
              <br />
              {result.mealTiming || "ไม่ระบุ"}
            </p>
            <p>
              <b>เวลาที่ต้องทาน</b>
              <br />
              {toWhenTimes(result.mealTiming, result.times).join(" · ") || "— ไม่ระบุบนฉลาก —"}
            </p>
          </div>
          <p className="border-t border-line pt-2 text-xs text-muted-foreground">{result.disclaimer}</p>
          <button type="button" onClick={() => onUse(result)} className="btn-primary w-full">
            ใช้ข้อมูลนี้กรอกฟอร์ม
          </button>
        </div>
      )}
    </div>
  );
}
