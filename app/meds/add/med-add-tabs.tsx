"use client";

import { useState } from "react";
import { MedForm, type MedPrefill } from "../list/med-form";
import { ScanForm, type ScannedLabel } from "./scan-form";

// Extract "ครั้งละ 1 เม็ด" -> 1 from the free-text usage line, best-effort only.
function parseDose(usage: string): number | undefined {
  const m = usage.match(/ครั้งละ\s*([\d.]+)\s*เม็ด/);
  return m ? parseFloat(m[1]) : undefined;
}

// Extract the leading number from "20 เม็ด" -> "20", best-effort only.
function parseRemaining(quantity: string): string | undefined {
  const m = quantity.match(/[\d.]+/);
  return m?.[0];
}

export function MedAddTabs({ allergies, drugs }: { allergies: string[]; drugs: string[] }) {
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [prefill, setPrefill] = useState<MedPrefill | undefined>();
  const [formKey, setFormKey] = useState(0);

  function handleUse(label: ScannedLabel) {
    setPrefill({
      name: label.name || undefined,
      remaining: parseRemaining(label.quantity),
      // ไม่เดามื้อที่แน่ชัด (เช้า/กลางวัน/เย็น) จาก OCR — ให้ผู้ดูแลเลือกเองจากวิธีใช้ที่แสดงไว้
      whenTime: "ตามแพทย์สั่ง",
      dose: parseDose(label.usage),
    });
    setFormKey((k) => k + 1);
    setMode("manual");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition-colors ${
            mode === "manual" ? "bg-white text-teal shadow" : "text-muted-foreground"
          }`}
        >
          กรอกเอง
        </button>
        <button
          type="button"
          onClick={() => setMode("scan")}
          className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition-colors ${
            mode === "scan" ? "bg-white text-teal shadow" : "text-muted-foreground"
          }`}
        >
          📷 ถ่ายรูปฉลากยา
        </button>
      </div>

      {mode === "manual" ? (
        <MedForm key={formKey} allergies={allergies} drugs={drugs} prefill={prefill} />
      ) : (
        <ScanForm onUse={handleUse} />
      )}
    </div>
  );
}
