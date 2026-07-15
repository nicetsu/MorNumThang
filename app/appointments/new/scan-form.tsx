"use client";

import { useRef, useState } from "react";

export type ScannedSlip = {
  date: string;
  time: string;
  hospital: string;
  department: string;
  doctor: string;
  rawText?: string;
  disclaimer?: string;
};

function formatThaiDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "— ไม่พบ —";
  const [y, m, d] = iso.split("-");
  const months = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10)]} ${parseInt(y, 10) + 543}`;
}

// Camera → OpenCV/PaddleOCR → Qwen (server-side, see app/api/appointments/scan/route.ts).
// Only reads the slip; nothing is saved until the caregiver reviews it in the form.
export function ScanForm({ onUse }: { onUse: (slip: ScannedSlip) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannedSlip | null>(null);

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
      const res = await fetch("/api/appointments/scan", { method: "POST", body: fd });
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
          <img src={preview} alt="ใบนัดที่ถ่าย" className="mx-auto max-h-64 rounded-xl object-contain" />
        ) : (
          <p className="py-6 text-sm text-muted-foreground">ถ่ายรูปใบนัดให้เห็นวันเวลา โรงพยาบาล และแผนกชัด ๆ นะคะ</p>
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
            {preview ? "ถ่ายใหม่" : "ถ่ายรูปใบนัด"}
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
          <p className="font-extrabold text-teal">ผลจากการอ่านใบนัด</p>
          <div className="space-y-2 text-sm">
            <p>
              <b>วันนัด</b>
              <br />
              {formatThaiDate(result.date)}
            </p>
            <p>
              <b>เวลานัด</b>
              <br />
              {result.time || "— ไม่พบ —"}
            </p>
            <p>
              <b>โรงพยาบาล</b>
              <br />
              {result.hospital || "— ไม่พบ —"}
            </p>
            <p>
              <b>แผนก / คลินิก</b>
              <br />
              {result.department || "— ไม่พบ —"}
            </p>
            <p>
              <b>แพทย์ผู้ตรวจ</b>
              <br />
              {result.doctor || "— ไม่ระบุ —"}
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
