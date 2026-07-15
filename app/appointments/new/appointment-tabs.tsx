"use client";

import { useState } from "react";
import { AppointmentForm, type AppointmentPrefill } from "./appointment-form";
import { ScanForm, type ScannedSlip } from "./scan-form";

type Followup = { note: string; place: string | null };

// The form has no separate department/doctor fields — fold them into "เรื่องที่นัด" (note).
function buildNote(department: string, doctor: string): string | undefined {
  const parts = [department, doctor && `พบ ${doctor}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export function AppointmentTabs({ followups, hospitals }: { followups: Followup[]; hospitals: string[] }) {
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [prefill, setPrefill] = useState<AppointmentPrefill | undefined>();
  const [formKey, setFormKey] = useState(0);

  function handleUse(slip: ScannedSlip) {
    setPrefill({
      note: buildNote(slip.department, slip.doctor),
      place: slip.hospital || undefined,
      date: slip.date || undefined,
      time: slip.time || undefined,
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
          ถ่ายรูปใบนัด
        </button>
      </div>

      {mode === "manual" ? (
        <AppointmentForm key={formKey} followups={followups} hospitals={hospitals} prefill={prefill} />
      ) : (
        <ScanForm onUse={handleUse} />
      )}
    </div>
  );
}
