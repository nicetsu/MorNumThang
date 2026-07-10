"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";
import { addAppointment } from "../actions";

type Followup = { note: string; place: string | null };

// ponytail: shared by the date PopoverTrigger only — the real fields use <Input>, whose default matches these tokens.
const inputCls =
  "min-h-[54px] w-full rounded-[14px] border border-line bg-white px-4 text-[18px] outline-none focus:border-teal";

// New-appointment form (screen 12): followup cards prefill, hospital suggestions, shadcn date picker.
export function AppointmentForm({
  followups,
  hospitals,
}: {
  followups: Followup[];
  hospitals: string[];
}) {
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  return (
    <form action={addAppointment} className="flow-form">
      {followups.length > 0 && (
        <div>
          <div className="section-heading"><h3>นัดต่อเนื่องจากประวัติ</h3></div>
          <p className="section-subtitle -mt-2">แตะเพื่อดึงเรื่องที่นัดและโรงพยาบาลจากนัดก่อน แล้วเลือกวันเวลาใหม่ได้เลย</p>
          <div className="followup-cards">
            {followups.map((f, i) => (
              <button
                key={i}
                type="button"
                className="followup-card"
                onClick={() => {
                  setNote(f.note);
                  setPlace(f.place ?? "");
                }}
              >
                <span>
                  <strong>{f.note}</strong>
                  {f.place && <small>{f.place}</small>}
                </span>
                <b>ใช้นัดนี้</b>
              </button>
            ))}
          </div>
        </div>
      )}

      <label>
        <span>เรื่องที่นัด</span>
        <Input name="note" required value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ติดตามอายุรกรรมหัวใจ" />
      </label>

      <Combobox
        label="โรงพยาบาลหรือสถานที่"
        name="place"
        value={place}
        onChange={setPlace}
        options={hospitals.map((h) => ({ value: h, label: h }))}
        placeholder="เลือกหรือพิมพ์โรงพยาบาล"
        searchPlaceholder="ค้นหาโรงพยาบาล…"
        allowCustom
      />

      <div className="form-grid">
        <label>
          <span>วันที่</span>
          <input type="hidden" name="date" value={date ? format(date, "yyyy-MM-dd") : ""} />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={`${inputCls} text-left`}>
              {date ? (
                format(date, "d MMM yyyy", { locale: th })
              ) : (
                <span className="text-muted-foreground">เลือกวันที่</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setOpen(false);
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </label>
        <label>
          <span>เวลา</span>
          <Input name="time" type="time" />
        </label>
      </div>

      <button type="submit" disabled={!date} className="btn-primary disabled:opacity-60">
        เก็บนัดลงสมุด
      </button>
    </form>
  );
}
