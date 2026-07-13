"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { isAllergic } from "@/lib/allergy";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";
import { addMedication, type MedState } from "./actions";

const WHEN_OPTIONS = [
  { value: "ก่อนอาหารเช้า", label: "ก่อนอาหารเช้า" },
  { value: "หลังอาหารเช้า", label: "หลังอาหารเช้า" },
  { value: "ก่อนอาหารกลางวัน", label: "ก่อนอาหารกลางวัน" },
  { value: "หลังอาหารกลางวัน", label: "หลังอาหารกลางวัน" },
  { value: "ก่อนอาหารเย็น", label: "ก่อนอาหารเย็น" },
  { value: "หลังอาหารเย็น", label: "หลังอาหารเย็น" },
  { value: "ก่อนนอน", label: "ก่อนนอน" },
  { value: "ตามแพทย์สั่ง", label: "ตามแพทย์สั่ง" },
  { value: "custom", label: "⏱ ระบุเวลาเอง..." },
];

// Thai time slots grouped by period — Arabic numerals, Thai time names
const THAI_TIME_GROUPS = [
  {
    period: "เช้า ☀️",
    color: "amber",
    times: [
      { label: "6 โมงเช้า", value: "06:00" },
      { label: "7 โมงเช้า", value: "07:00" },
      { label: "8 โมงเช้า", value: "08:00" },
      { label: "9 โมงเช้า", value: "09:00" },
      { label: "10 โมงเช้า", value: "10:00" },
      { label: "11 โมงเช้า", value: "11:00" },
    ],
  },
  {
    period: "กลางวัน 🌤",
    color: "teal",
    times: [
      { label: "เที่ยง", value: "12:00" },
      { label: "บ่าย 1 โมง", value: "13:00" },
      { label: "บ่าย 2 โมง", value: "14:00" },
      { label: "บ่าย 3 โมง", value: "15:00" },
      { label: "บ่าย 4 โมง", value: "16:00" },
    ],
  },
  {
    period: "เย็น 🌅",
    color: "clay",
    times: [
      { label: "5 โมงเย็น", value: "17:00" },
      { label: "6 โมงเย็น", value: "18:00" },
    ],
  },
  {
    period: "กลางคืน 🌙",
    color: "ink",
    times: [
      { label: "1 ทุ่ม", value: "19:00" },
      { label: "2 ทุ่ม", value: "20:00" },
      { label: "3 ทุ่ม", value: "21:00" },
      { label: "4 ทุ่ม", value: "22:00" },
      { label: "5 ทุ่ม", value: "23:00" },
    ],
  },
];

// Convert "HH:MM" to the Thai chip label for display on the select button
function toThaiLabel(hhmm: string): string {
  for (const g of THAI_TIME_GROUPS) {
    const t = g.times.find((t) => t.value === hhmm);
    if (t) return t.label;
  }
  return hhmm;
}

// Period header colors mapped to Tailwind-safe classes
const PERIOD_STYLES: Record<string, { header: string; chip: string; chipActive: string }> = {
  amber: {
    header: "text-[#76500e]",
    chip: "border-amber/40 text-[#76500e] bg-amber-soft hover:bg-amber/20",
    chipActive: "border-amber bg-amber text-white shadow-md",
  },
  teal: {
    header: "text-teal",
    chip: "border-teal/30 text-teal bg-teal-soft hover:bg-teal/20",
    chipActive: "border-teal bg-teal text-white shadow-md",
  },
  clay: {
    header: "text-clay",
    chip: "border-clay/30 text-clay bg-clay-soft hover:bg-clay/20",
    chipActive: "border-clay bg-clay text-white shadow-md",
  },
  ink: {
    header: "text-[#2b2b28]",
    chip: "border-line text-[#2b2b28] bg-muted/30 hover:bg-muted/60",
    chipActive: "border-[#2b2b28] bg-[#2b2b28] text-white shadow-md",
  },
};

function ThaiTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 rounded-2xl border border-teal/20 bg-gradient-to-b from-ivory to-white p-3 space-y-3 shadow-sm">
      {THAI_TIME_GROUPS.map((group) => {
        const styles = PERIOD_STYLES[group.color];
        return (
          <div key={group.period}>
            <p className={`text-[11px] font-black mb-1.5 tracking-wide uppercase ${styles.header}`}>
              {group.period}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.times.map((t) => {
                const active = value === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => onChange(t.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                      active ? styles.chipActive : styles.chip
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="pt-1 border-t border-line">
        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">หรือพิมพ์เวลาเองได้เลยค่ะ</p>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-10 rounded-xl border border-teal/30 bg-ivory px-3 py-1.5 text-sm font-bold text-teal focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>
    </div>
  );
}

export type MedPrefill = { name?: string; remaining?: string; whenTime?: string; dose?: number };

export function MedForm({
  allergies,
  drugs,
  prefill,
}: {
  allergies: string[];
  drugs: string[];
  prefill?: MedPrefill;
}) {
  const [state, action, pending] = useActionState<MedState, FormData>(
    addMedication,
    {},
  );
  const [med, setMed] = useState(prefill?.name ?? "");
  const [schedules, setSchedules] = useState<{ whenTime: string; customTime: string; dose: number }[]>([
    prefill?.whenTime
      ? { whenTime: prefill.whenTime, customTime: "08:00", dose: prefill.dose ?? 1 }
      : { whenTime: "หลังอาหารเช้า", customTime: "08:00", dose: 1 },
  ]);

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
  }, [state.ok]);

  const medOptions = drugs.map((name) => {
    const blocked = isAllergic(name, allergies);
    return { value: name, label: blocked ? `${name} · แพ้ยา — เลือกไม่ได้` : name, disabled: blocked };
  });

  return (
    <form action={action} className="flow-form">
      <Combobox
        label="เลือกยา"
        name="name"
        value={med}
        onChange={setMed}
        options={medOptions}
        placeholder="— เลือกยา —"
        searchPlaceholder="ค้นหายา…"
        allowCustom
      />

      <div className="space-y-3">
        <label className="field-label">ช่วงเวลาทานยาและขนาดรับประทาน</label>

        <div className="space-y-3">
          {schedules.map((item, index) => (
            <div key={index} className="rounded-xl border border-line bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-teal">ช่วงที่ {index + 1}</span>
                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSchedules((prev) => prev.filter((_, i) => i !== index))}
                    className="text-sm font-bold text-clay hover:opacity-80"
                  >
                    ลบช่วงนี้
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Timing selector */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold text-muted-foreground block mb-1">ช่วงเวลาที่ใช้</span>
                  <select
                    value={item.whenTime}
                    onChange={(e) =>
                      setSchedules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, whenTime: e.target.value } : x))
                      )
                    }
                    className="w-full min-h-11 rounded-lg border border-line bg-ivory px-2.5 py-1.5 text-sm"
                  >
                    {WHEN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dose input */}
                <div>
                  <span className="text-xs font-bold text-muted-foreground block mb-1">ครั้งละ (เม็ด)</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={item.dose}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSchedules((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, dose: Number.isFinite(val) ? val : 1 } : x))
                        );
                      }}
                      className="min-h-11 text-sm pr-[58px]"
                    />
                    <b className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">เม็ด</b>
                  </div>
                </div>
              </div>

              {/* Thai time picker — shown only for custom */}
              {item.whenTime === "custom" && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-teal">⏱</span>
                    <span className="text-sm font-bold text-teal">
                      {toThaiLabel(item.customTime)} ({item.customTime} น.)
                    </span>
                  </div>
                  <ThaiTimePicker
                    value={item.customTime}
                    onChange={(v) =>
                      setSchedules((prev) =>
                        prev.map((x, i) => (i === index ? { ...x, customTime: v } : x))
                      )
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const standardTimings = WHEN_OPTIONS
              .filter((o) => o.value !== "custom" && o.value !== "ตามแพทย์สั่ง")
              .map((o) => o.value);
            const currentTimings = schedules.map((s) => s.whenTime);
            const unusedTiming = standardTimings.find((t) => !currentTimings.includes(t)) ?? "custom";
            setSchedules((prev) => [...prev, { whenTime: unusedTiming, customTime: "08:00", dose: 1 }]);
          }}
          className="min-h-11 w-full rounded-xl border-2 border-dashed border-teal/30 hover:border-teal/65 text-teal text-sm font-bold flex items-center justify-center gap-1 bg-teal-soft/30 hover:bg-teal-soft/60 transition-all cursor-pointer"
        >
          + เพิ่มช่วงเวลาทานยา
        </button>
      </div>

      <input
        type="hidden"
        name="schedules"
        value={JSON.stringify(
          schedules.map((s) => ({
            whenTime: s.whenTime === "custom" ? `เวลา ${s.customTime}` : s.whenTime,
            dose: s.dose,
          }))
        )}
      />

      <label>
        <span>จำนวนที่เหลือ (ไม่บังคับ)</span>
        <div className="unit-input">
          <Input className="pr-[58px]" name="remaining" type="number" min="0" placeholder="เช่น 30" />
          <b>เม็ด</b>
        </div>
      </label>

      <div className="safety-box">
        <strong>จดเพื่อช่วยจำเท่านั้น</strong>
        <p>หมอนำทางจะไม่แนะนำให้หยุด เพิ่ม หรือลดยา หากไม่แน่ใจให้โทรถามแพทย์หรือเภสัชกรค่ะ</p>
      </div>

      {state.error && <p className="allergy-note">{state.error}</p>}

      <button type="submit" disabled={pending || !med} className="btn-primary disabled:opacity-60">
        เพิ่มยา
      </button>
    </form>
  );
}
