"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { MED_OPTIONS, isAllergic } from "@/lib/allergy";
import { addMedication, type MedState } from "./actions";

export function MedForm({ allergies }: { allergies: string[] }) {
  const [state, action, pending] = useActionState<MedState, FormData>(
    addMedication,
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
  }, [state.ok]);

  return (
    <form action={action} className="flow-form">
      <label>
        <span>เลือกยา</span>
        <select name="name" required defaultValue="">
          <option value="" disabled>— เลือกยา —</option>
          {MED_OPTIONS.map((name) => {
            const blocked = isAllergic(name, allergies);
            return (
              <option key={name} value={name} disabled={blocked}>
                {blocked ? `${name} · แพ้ยา — เลือกไม่ได้` : name}
              </option>
            );
          })}
        </select>
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
        <select name="whenTime" defaultValue="หลังอาหารเช้า">
          <option>หลังอาหารเช้า</option>
          <option>ก่อนอาหารเช้า</option>
          <option>หลังอาหารกลางวัน</option>
          <option>หลังอาหารเย็น</option>
          <option>ก่อนนอน</option>
          <option>ตามแพทย์สั่ง</option>
        </select>
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

      <button type="submit" disabled={pending} className="btn-primary">
        เพิ่มยา
      </button>
    </form>
  );
}
