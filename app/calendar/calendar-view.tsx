"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight,
  HeartPulse, Pill, Plus, Stethoscope, X,
} from "lucide-react";
import { toggleCheck, addCareTask, deleteCareTask, toggleAppointmentDone } from "./actions";

type Item = { key: string; title: string; meta: string };
type Task = { id: string; key: string; category: string; title: string; meta: string };
type Appt = { id: string; dateKey: string; time: string; note: string; place: string | null; done: boolean };

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const WEEKDAY_LONG = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (k: string) => k.split("-").map(Number) as [number, number, number];

type Color = "full" | "partial" | "none";
const PARTIAL = "#a9a48f";

export function CalendarView({
  todayISO, medItems, taskItems, checksByDate, appts,
}: {
  todayISO: string;
  medItems: Item[];
  taskItems: Task[];
  checksByDate: Record<string, string[]>;
  appts: Appt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState(todayISO);

  const [done, setDone] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const [date, keys] of Object.entries(checksByDate)) for (const k of keys) s.add(`${date}|${k}`);
    return s;
  });
  const isDone = (date: string, key: string) => done.has(`${date}|${key}`);

  const allKeys = useMemo(
    () => [...medItems.map((m) => m.key), ...taskItems.map((t) => t.key)],
    [medItems, taskItems],
  );
  const total = allKeys.length;
  const doneCount = (date: string) => allKeys.reduce((n, k) => n + (isDone(date, k) ? 1 : 0), 0);
  const colorOf = (date: string): Color => {
    const d = doneCount(date);
    return total === 0 || d === 0 ? "none" : d >= total ? "full" : "partial";
  };

  const toggle = (key: string) => {
    const composite = `${selected}|${key}`;
    const next = new Set(done);
    const nowDone = !next.has(composite);
    if (nowDone) next.add(composite); else next.delete(composite);
    setDone(next);
    start(() => { toggleCheck(key, selected, nowDone); });
  };

  // Appointment done-state (per event, not per day) — toggled straight on the Appointment row.
  const [apptDone, setApptDone] = useState<Set<string>>(() => new Set(appts.filter((a) => a.done).map((a) => a.id)));
  const toggleAppt = (id: string) => {
    const next = new Set(apptDone);
    const nowDone = !next.has(id);
    if (nowDone) next.add(id); else next.delete(id);
    setApptDone(next);
    start(() => { toggleAppointmentDone(id, nowDone); });
  };

  const [ty, tmRaw, td] = parse(todayISO);
  const tMonth = tmRaw - 1;
  const [sy, sm, sd] = parse(selected);
  const selMonth = sm - 1;
  const isToday = selected === todayISO;
  const fullDate = `${WEEKDAY_LONG[new Date(sy, selMonth, sd).getDay()]}ที่ ${sd} ${MONTHS[selMonth]} ${sy + 543}`;

  // ---- Day strip: today ±10, horizontally scrollable, auto-centered on the selected day ----
  const stripDays = useMemo(() =>
    Array.from({ length: 21 }, (_, i) => {
      const d = new Date(ty, tMonth, td - 10 + i);
      return { key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), dow: d.getDay() };
    }), [ty, tMonth, td]);
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[data-sel="1"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected, mode]);

  // ---- Month grid ----
  const [viewYear, setViewYear] = useState(sy);
  const [viewMonth, setViewMonth] = useState(selMonth);
  const openMonth = () => { setViewYear(sy); setViewMonth(selMonth); setMode("month"); };
  const stepMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };
  const monthCells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const selAppts = appts.filter((a) => a.dateKey === selected).sort((a, b) => a.time.localeCompare(b.time));
  const hasApptOn = useMemo(() => new Set(appts.map((a) => a.dateKey)), [appts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-teal-soft/70 p-4">
        <h2 className="text-[22px] font-extrabold leading-tight text-ink">
          {isToday ? "วันนี้ต้องทำอะไรบ้าง" : "รายการของวันที่เลือก"}
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">{fullDate}</p>
      </div>

      {/* Calendar */}
      {mode === "week" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-[17px] font-extrabold text-ink">{MONTHS[selMonth]} {sy + 543}</strong>
            <button type="button" onClick={openMonth}
              className="flex items-center gap-1 rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-[13px] font-bold text-teal">
              ดูรายเดือน <CalendarIcon className="size-4" />
            </button>
          </div>

          <div ref={stripRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stripDays.map((d) => {
              const c = colorOf(d.key);
              const sel = d.key === selected;
              return (
                <button key={d.key} type="button" data-sel={sel ? 1 : undefined} onClick={() => setSelected(d.key)}
                  className={`flex w-11 shrink-0 flex-col items-center gap-1.5 rounded-2xl py-2 ${sel ? "bg-teal-soft" : ""}`}>
                  <span className="text-xs text-muted-foreground">{WEEKDAYS[d.dow]}</span>
                  <span className="relative flex size-[34px] items-center justify-center rounded-full text-[15px] font-bold"
                    style={dayNumStyle(c, sel)}>
                    {d.day}
                    {hasApptOn.has(d.key) && <i className="absolute -bottom-0.5 size-1 rounded-full" style={{ background: c === "none" ? "var(--clay)" : "#fff" }} />}
                  </span>
                </button>
              );
            })}
          </div>
          <Legend />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => stepMonth(-1)} aria-label="เดือนก่อน"
                className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-white text-ink">
                <ChevronLeft className="size-5" />
              </button>
              <strong className="text-[17px] font-extrabold text-ink">{MONTHS[viewMonth]} {viewYear + 543}</strong>
              <button type="button" onClick={() => stepMonth(1)} aria-label="เดือนถัดไป"
                className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-white text-ink">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <button type="button" onClick={() => setMode("week")}
              className="flex items-center gap-1 rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-[13px] font-bold text-teal">
              ปิด <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => <span key={w} className="pb-1">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const key = keyOf(viewYear, viewMonth, d);
              const c = colorOf(key);
              const today = key === todayISO;
              return (
                <button key={i} type="button"
                  onClick={() => { setSelected(key); setMode("week"); }}
                  className="flex aspect-square items-center justify-center rounded-[10px] text-[13px] font-bold"
                  style={{ ...monthCellStyle(c), ...(today ? { outline: "2px solid var(--teal)", outlineOffset: "1px" } : null) }}>
                  {d}
                </button>
              );
            })}
          </div>
          <Legend />
        </div>
      )}

      {/* Progress */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[17px] font-extrabold text-ink">รายการดูแลประจำวัน</h3>
          <span className="text-[15px] font-bold text-teal">{doneCount(selected)}/{total} เสร็จแล้ว</span>
        </div>
        <p className="text-[15px] text-muted-foreground">แบ่งตามช่วงเวลา ให้เห็นชัดว่าตอนนี้ต้องทำอะไร</p>
      </div>

      {/* Appointments for the selected day — events with their own done state (not part of
          the daily-care X/Y progress or the calendar day coloring, which stay meds+tasks). */}
      <ApptCard appts={selAppts} isDone={(id) => apptDone.has(id)} onToggle={toggleAppt} />

      {/* Category cards */}
      <MedCard items={medItems} isDone={(k) => isDone(selected, k)} onToggle={toggle} />
      <TaskCard category="สุขภาพ" label="การติดตามสุขภาพ" Icon={HeartPulse}
        tasks={taskItems.filter((t) => t.category === "สุขภาพ")}
        isDone={(k) => isDone(selected, k)} onToggle={toggle} onChanged={() => start(() => router.refresh())} pending={pending} />
      <TaskCard category="ฟื้นฟู" label="การฟื้นฟู" Icon={Activity}
        tasks={taskItems.filter((t) => t.category === "ฟื้นฟู")}
        isDone={(k) => isDone(selected, k)} onToggle={toggle} onChanged={() => start(() => router.refresh())} pending={pending} />
    </div>
  );
}

// Day-number circle style (week strip): fill for done/partial, outline for none, ring when selected.
function dayNumStyle(c: Color, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties =
    c === "full" ? { background: "var(--teal)", color: "#fff" }
    : c === "partial" ? { background: PARTIAL, color: "#fff" }
    : { border: "1.5px solid var(--line)", color: "var(--ink)" };
  if (selected) {
    if (c === "none") return { ...base, border: "1.5px solid var(--teal)", color: "var(--teal)" };
    return { ...base, outline: "2px solid var(--teal)", outlineOffset: "2px" };
  }
  return base;
}

function monthCellStyle(c: Color): React.CSSProperties {
  if (c === "full") return { background: "var(--teal)", color: "#fff", border: "1.5px solid var(--teal)" };
  if (c === "partial") return { background: PARTIAL, color: "#fff", border: `1.5px solid ${PARTIAL}` };
  return { background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" };
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-teal" /> ทำครบ</span>
      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: PARTIAL }} /> ทำบางส่วน</span>
      <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full border-[1.5px] border-line bg-white" /> ยังไม่ได้ทำ</span>
    </div>
  );
}

function CategoryHead({ Icon, label, action }: { Icon: typeof HeartPulse; label: string; action: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-teal-soft text-teal"><Icon className="size-[18px]" /></span>
        <span className="text-[15px] font-bold text-ink">{label}</span>
      </div>
      {action}
    </div>
  );
}

function TaskRow({ checked, title, meta, onToggle, onDelete }: {
  checked: boolean; title: string; meta: string; onToggle: () => void; onDelete?: () => void;
}) {
  return (
    <div className="flex items-center border-t border-line first:border-t-0">
      <button type="button" onClick={onToggle} aria-pressed={checked}
        className="flex flex-1 items-center gap-2.5 rounded-lg px-1 py-2.5 text-left hover:bg-teal-soft/60">
        <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.8px] ${checked ? "border-teal bg-teal text-white" : "border-line bg-white text-transparent"}`}>
          <Check className="size-[15px]" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] ${checked ? "text-muted-foreground line-through" : "text-ink"}`}>{title}</span>
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        </span>
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label="ลบรายการ" className="shrink-0 px-1 text-muted-foreground/50 hover:text-clay">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function AddPill({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = "flex items-center gap-0.5 rounded-full bg-teal-soft px-2.5 py-1.5 text-[13px] font-bold text-teal";
  return href ? <Link href={href} className={cls}>{children}</Link> : <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

function ApptCard({ appts, isDone, onToggle }: {
  appts: Appt[]; isDone: (id: string) => boolean; onToggle: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-3.5">
      <CategoryHead Icon={Stethoscope} label="การนัดหมอ"
        action={<AddPill href="/appointments/new"><Plus className="size-[15px]" /> เพิ่มนัด</AddPill>} />
      {appts.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">ไม่มีนัดในวันนี้</p>
      ) : (
        appts.map((a) => (
          <TaskRow key={a.id} checked={isDone(a.id)} title={a.note}
            meta={`${a.time} น.${a.place ? ` · ${a.place}` : ""}`} onToggle={() => onToggle(a.id)} />
        ))
      )}
    </section>
  );
}

function MedCard({ items, isDone, onToggle }: {
  items: Item[]; isDone: (k: string) => boolean; onToggle: (k: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-3.5">
      <CategoryHead Icon={Pill} label="การใช้ยา" action={<AddPill href="/meds/add"><Plus className="size-[15px]" /> เพิ่มยา</AddPill>} />
      {items.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">ยังไม่มียา — แตะ “เพิ่มยา”</p>
      ) : (
        items.map((m) => <TaskRow key={m.key} checked={isDone(m.key)} title={m.title} meta={m.meta} onToggle={() => onToggle(m.key)} />)
      )}
    </section>
  );
}

function TaskCard({ category, label, Icon, tasks, isDone, onToggle, onChanged, pending }: {
  category: string; label: string; Icon: typeof HeartPulse; tasks: Task[];
  isDone: (k: string) => boolean; onToggle: (k: string) => void; onChanged: () => void; pending: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const add = () => {
    const t = title.trim();
    if (!t) { setAdding(false); return; }
    addCareTask(category, t).then(onChanged);
    setTitle(""); setAdding(false);
  };
  return (
    <section className="rounded-2xl border border-line bg-card p-3.5">
      <CategoryHead Icon={Icon} label={label} action={<AddPill onClick={() => setAdding((v) => !v)}><Plus className="size-[15px]" /> เพิ่ม</AddPill>} />
      {tasks.length === 0 && !adding && <p className="py-1 text-sm text-muted-foreground">ยังไม่มีรายการ — แตะ “เพิ่ม”</p>}
      {tasks.map((t) => (
        <TaskRow key={t.key} checked={isDone(t.key)} title={t.title} meta={t.meta}
          onToggle={() => onToggle(t.key)} onDelete={() => deleteCareTask(t.id).then(onChanged)} />
      ))}
      {adding && (
        <div className="mt-2 flex gap-2 border-t border-line pt-2.5">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder="เช่น วัดชีพจร" className="min-h-10 flex-1 rounded-lg border border-line bg-ivory px-3 text-sm" />
          <button type="button" onClick={add} disabled={pending}
            className="min-h-10 rounded-lg bg-teal px-4 text-sm font-bold text-white disabled:opacity-60">เพิ่ม</button>
        </div>
      )}
    </section>
  );
}
