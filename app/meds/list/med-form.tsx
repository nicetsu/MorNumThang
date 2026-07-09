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
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <label className="block">
        <span className="mb-1 block font-bold">เลือกยา</span>
        <select
          name="name"
          required
          defaultValue=""
          className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-lg"
        >
          <option value="" disabled>
            — เลือกยา —
          </option>
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

      <label className="block">
        <span className="mb-1 block font-bold">เวลา (ไม่บังคับ)</span>
        <input
          name="schedule"
          placeholder="เช่น เช้า · หลังอาหาร"
          className="w-full rounded-xl border border-line bg-ivory px-4 py-3"
        />
      </label>

      {state.error && (
        <p className="rounded-xl bg-red-soft px-4 py-3 font-bold text-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-teal py-3 text-lg font-bold text-white disabled:opacity-60"
      >
        เพิ่มยา
      </button>
    </form>
  );
}
