"use client";

import { useState } from "react";
import { Combobox } from "@/components/combobox";
import { addAllergy } from "../list/actions";

// Allergy input as a searchable combobox (same component as เลือกยา) that also allows custom text.
export function AllergyForm({ drugs }: { drugs: string[] }) {
  const [val, setVal] = useState("");

  return (
    <form
      action={async (fd) => {
        await addAllergy(fd);
        setVal("");
      }}
      className="flex gap-2"
    >
      <div className="flex-1">
        <Combobox
          name="name"
          value={val}
          onChange={setVal}
          options={drugs.map((d) => ({ value: d, label: d }))}
          allowCustom
          placeholder="เลือกหรือพิมพ์ยาที่แพ้"
          searchPlaceholder="ค้นหายา…"
        />
      </div>
      <button
        type="submit"
        disabled={!val}
        className="min-h-[54px] rounded-[14px] bg-clay px-5 font-extrabold text-white disabled:opacity-60"
      >
        เพิ่ม
      </button>
    </form>
  );
}
