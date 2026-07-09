"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { isAllergic } from "@/lib/allergy";
import { Combobox } from "@/components/combobox";
import { addMedication, type MedState } from "./actions";

const WHEN_OPTIONS = [
  "หลังอาหารเช้า",
  "ก่อนอาหารเช้า",
  "หลังอาหารกลางวัน",
  "หลังอาหารเย็น",
  "ก่อนนอน",
  "ตามแพทย์สั่ง",
].map((w) => ({ value: w, label: w }));

export function MedForm({ allergies, drugs }: { allergies: string[]; drugs: string[] }) {
  const [state, action, pending] = useActionState<MedState, FormData>(
    addMedication,
    {},
  );
  const [med, setMed] = useState("");
  const [when, setWhen] = useState("หลังอาหารเช้า");

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
  }, [state.ok]);

  const medOptions = drugs.map((name) => {
    const blocked = isAllergic(name, allergies);
    return { value: name, label: blocked ? `${name} · แพ้ยา — เลือกไม่ได้` : name, disabled: blocked };
  });

  return (
    <form action={action} className="flow-form">
      <label>
        <span>เลือกยา</span>
        <Combobox
          name="name"
          value={med}
          onChange={setMed}
          options={medOptions}
          placeholder="— เลือกยา —"
          searchPlaceholder="ค้นหายา…"
        />
      </label>

      <div className="form-grid">
        <label>
          <span>ครั้งละ</span>
          <div className="unit-input">
            <input name="dose" type="number" min="0.5" step="0.5" defaultValue="1" />
            <b>เม็ด</b>
          </div>
        </label>
        <label>
          <span>วันละ</span>
          <div className="unit-input">
            <input name="perDay" type="number" min="1" defaultValue="1" />
            <b>ครั้ง</b>
          </div>
        </label>
      </div>

      <label>
        <span>ช่วงเวลาที่ใช้</span>
        <Combobox
          name="whenTime"
          value={when}
          onChange={setWhen}
          options={WHEN_OPTIONS}
          searchPlaceholder="ค้นหาช่วงเวลา…"
        />
      </label>

      <label>
        <span>จำนวนที่เหลือ (ไม่บังคับ)</span>
        <div className="unit-input">
          <input name="remaining" type="number" min="0" placeholder="เช่น 30" />
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
