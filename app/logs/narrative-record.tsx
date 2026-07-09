"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { organizeNarrativeAction, saveObservations } from "./actions";
import { AI_DISCLAIMER } from "@/lib/disclaimer";

type Item = { category: string; text: string; severity: number };

// Dot color by AI severity: 0-3 เขียว, 4-7 เหลือง, 8-10 แดง.
function sevColor(s: number): string {
  return s >= 8 ? "bg-red" : s >= 4 ? "bg-amber" : "bg-teal";
}

const CHIPS = [
  { label: "กินน้อยลง", value: "ช่วงนี้แม่กินน้อยลง" },
  { label: "เดินไม่เหมือนเดิม", value: "ช่วงนี้แม่เดินไม่เหมือนเดิม" },
  { label: "นอนเปลี่ยนไป", value: "ช่วงนี้การนอนของแม่เปลี่ยนไป" },
  { label: "วันนี้มีเรื่องดี", value: "วันนี้แม่กินหมดจาน เป็นเรื่องดี" },
];

export function NarrativeRecord() {
  const [story, setStory] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [organizing, startOrganize] = useTransition();
  const [saving, startSave] = useTransition();

  function organize() {
    if (!story.trim()) return;
    startOrganize(async () => {
      const result = await organizeNarrativeAction(story);
      if (result.length === 0) {
        toast.error("จัดหมวดไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
        return;
      }
      setItems(result);
    });
  }

  function save() {
    if (!items) return;
    startSave(async () => {
      await saveObservations(items);
      toast.success("เก็บลงสมุดแล้วค่ะ");
      setStory("");
      setItems(null);
    });
  }

  const cls = "w-full rounded-xl border border-line bg-ivory px-4 py-3";

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <p className="text-muted-foreground">
        พูดหรือพิมพ์สั้น ๆ ได้เลย เดี๋ยว AI ช่วยจัดเข้าหมวดให้
      </p>

      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value)}
        rows={4}
        placeholder="เช่น ช่วงนี้แม่กินน้อยลง ดื่มน้ำน้อย แล้วก็ตื่นเข้าห้องน้ำบ่อย"
        className={cls}
      />

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setStory((s) => (s ? `${s} ${c.value}` : c.value))}
            className="min-h-10 rounded-full bg-teal-soft px-3 font-bold text-teal"
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={organize}
        disabled={organizing || !story.trim()}
        className="btn-primary"
      >
        {organizing ? "กำลังจัดหมวด…" : "ช่วยจัดลงสมุด"}
      </button>

      {items && (
        <div className="space-y-3 rounded-xl bg-ivory p-4">
          <strong className="block text-teal">ตรวจก่อนบันทึก — แก้ไขได้เลยค่ะ</strong>
          {items.map((it, i) => (
            <div key={i} className="space-y-1 rounded-xl border border-line bg-card p-3">
              <div className="flex items-center gap-2">
                <span className={`size-3 shrink-0 rounded-full ${sevColor(it.severity)}`} title={`ความควรใส่ใจ ${it.severity}/10`} aria-hidden />
                <input
                  value={it.category}
                  onChange={(e) =>
                    setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))
                  }
                  className="w-full rounded-lg border border-line bg-ivory px-3 py-1.5 text-sm font-bold"
                />
              </div>
              <textarea
                value={it.text}
                onChange={(e) =>
                  setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                }
                rows={2}
                className="w-full rounded-lg border border-line bg-ivory px-3 py-1.5"
              />
              <button
                type="button"
                onClick={() => setItems((arr) => arr!.filter((_, j) => j !== i))}
                className="text-sm font-bold text-clay"
              >
                ลบข้อนี้
              </button>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">{AI_DISCLAIMER}</p>
          <button
            type="button"
            onClick={save}
            disabled={saving || items.length === 0}
            className="btn-primary"
          >
            {saving ? "กำลังบันทึก…" : "ถูกต้อง บันทึกลงสมุด"}
          </button>
        </div>
      )}
    </div>
  );
}
