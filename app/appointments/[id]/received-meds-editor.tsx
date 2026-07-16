"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISCLAIMER } from "@/lib/disclaimer";
import { WHEN_TIME_VALUES } from "@/lib/meds";
import { organizeMedsReceivedAction, saveReceivedMeds } from "../actions";

type Item = { name: string; dose: number; whenTime: string };

// "ยาที่ได้รับมา" — the textarea still submits as free text with the visit-note form
// (unchanged), but this button lets AI split it into real meds the caregiver reviews
// and saves straight to the ยาที่ต้องทาน list (AGENTS.md rule 2: never auto-saved).
export function ReceivedMedsEditor() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [organizing, startOrganize] = useTransition();
  const [saving, startSave] = useTransition();

  function organize() {
    if (!text.trim()) return;
    startOrganize(async () => {
      const result = await organizeMedsReceivedAction(text);
      if (result.length === 0) {
        toast.error("แยกรายการยาไม่สำเร็จ ลองพิมพ์ให้ชัดขึ้นนะคะ");
        return;
      }
      setItems(result);
    });
  }

  function save() {
    if (!items || items.length === 0) return;
    startSave(async () => {
      const res = await saveReceivedMeds(items);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.ok ?? "เพิ่มยาลงรายการแล้วค่ะ");
      setItems(null);
    });
  }

  return (
    <div className="space-y-2">
      <label>
        <span>ยาที่ได้รับมา</span>
        <Textarea
          name="medsReceived"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เช่น ยาความดัน 1 เม็ดเช้า"
        />
      </label>

      <button
        type="button"
        onClick={organize}
        disabled={organizing || !text.trim()}
        className="btn-outline w-full disabled:opacity-60"
      >
        {organizing ? "กำลังแยกรายการ…" : "ให้ AI ช่วยแยกเป็นรายการยา"}
      </button>

      {items && (
        <div className="space-y-2 rounded-xl bg-ivory p-3">
          <p className="text-sm font-bold text-teal">ตรวจก่อนเพิ่มลงรายการยา — แก้ไขได้เลยค่ะ</p>
          {items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card p-2">
              <input
                value={it.name}
                onChange={(e) =>
                  setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                className="min-w-0 flex-1 rounded-lg border border-line bg-ivory px-2 py-1 text-sm"
              />
              <select
                value={it.whenTime}
                onChange={(e) =>
                  setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, whenTime: e.target.value } : x)))
                }
                className="rounded-lg border border-line bg-ivory px-2 py-1 text-sm"
              >
                {WHEN_TIME_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={it.dose}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setItems((arr) =>
                    arr!.map((x, j) => (j === i ? { ...x, dose: Number.isFinite(val) ? val : 1 } : x))
                  );
                }}
                className="w-16 rounded-lg border border-line bg-ivory px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => setItems((arr) => arr!.filter((_, j) => j !== i))}
                className="text-xs font-bold text-clay"
              >
                ลบ
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{AI_DISCLAIMER}</p>
          <button
            type="button"
            onClick={save}
            disabled={saving || items.length === 0}
            className="btn-primary w-full disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก…" : "เพิ่มยานี้ลงรายการยา"}
          </button>
        </div>
      )}
    </div>
  );
}
