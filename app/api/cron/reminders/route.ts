import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushLine } from "@/lib/line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TZ = "Asia/Bangkok";
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000; // Thailand is UTC+7, no DST
const EVENING = /เย็น|ก่อนนอน|นอน|กลางคืน/; // whenTime keywords that belong to the evening round

function bkkTodayStart(now: Date): Date {
  const bkk = new Date(now.getTime() + BKK_OFFSET_MS);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - BKK_OFFSET_MS);
}
function bkkDayOfWeek(now: Date): number {
  return new Date(now.getTime() + BKK_OFFSET_MS).getUTCDay(); // 0=Sun … 1=Mon
}
const DAY = 24 * 60 * 60 * 1000;
const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

const withCaregivers = { patient: { include: { caregivers: { select: { lineId: true } } } } };

// Accumulate lines per ผู้ดูแล (keyed by lineId), then send each one message.
function digestSender() {
  const buckets = new Map<string, string[]>();
  const add = (lineId: string, line: string) => {
    const b = buckets.get(lineId) ?? buckets.set(lineId, []).get(lineId)!;
    b.push(line);
  };
  return { add, buckets };
}

// --- Daily reminder: appointments + meds, split into a morning / evening round ---
async function buildDaily(now: Date, round: "morning" | "evening") {
  const todayStart = bkkTodayStart(now);
  const todayKey = dayKeyFmt.format(now);
  // morning: today + tomorrow; evening: tomorrow only (prep for the next day)
  const apptFrom = round === "evening" ? new Date(todayStart.getTime() + DAY) : todayStart;
  const apptTo = new Date(todayStart.getTime() + 2 * DAY);

  const [appts, meds] = await Promise.all([
    db.appointment.findMany({ where: { done: false, at: { gte: apptFrom, lt: apptTo } }, include: withCaregivers }),
    db.medication.findMany({ include: withCaregivers }),
  ]);

  // one bucket of {appts[], medsByPatient} per user
  type B = { appts: string[]; meds: Map<string, string[]> };
  const buckets = new Map<string, B>();
  const bucket = (id: string) => buckets.get(id) ?? buckets.set(id, { appts: [], meds: new Map() }).get(id)!;

  for (const a of appts) {
    const when = dayKeyFmt.format(a.at) === todayKey ? "วันนี้" : "พรุ่งนี้";
    const line = `• ${a.patient.name}: ${a.note ?? "นัดหมอ"} ${when} ${timeFmt.format(a.at)}${a.place ? ` ที่ ${a.place}` : ""}`;
    for (const c of a.patient.caregivers) bucket(c.lineId).appts.push(line);
  }
  for (const m of meds) {
    if (round === "evening" && !(m.whenTime && EVENING.test(m.whenTime))) continue; // evening: only evening meds
    const detail = [m.dose ? `${m.dose} เม็ด` : null, m.whenTime].filter(Boolean).join(" · ");
    const line = `• ${m.name}${detail ? ` · ${detail}` : ""}`;
    for (const c of m.patient.caregivers) {
      const map = bucket(c.lineId).meds;
      (map.get(m.patient.name) ?? map.set(m.patient.name, []).get(m.patient.name)!).push(line);
    }
  }

  const head = round === "evening" ? "🌙 หมอนำทาง · เตือนช่วงเย็น" : "🔔 หมอนำทาง · เตือนเช้านี้";
  const medHead = round === "evening" ? "💊 ยามื้อเย็น/ก่อนนอน" : "💊 ยาวันนี้";
  const apptHead = round === "evening" ? "📅 นัดพรุ่งนี้" : "📅 นัดหมอ";
  const out: { to: string; text: string }[] = [];
  for (const [lineId, b] of buckets) {
    if (b.appts.length === 0 && b.meds.size === 0) continue;
    const parts = [head];
    if (b.appts.length) parts.push(`\n${apptHead}\n` + b.appts.join("\n"));
    if (b.meds.size) {
      const blocks = [...b.meds].map(([name, lines]) => `${name}\n${lines.join("\n")}`);
      parts.push(`\n${medHead}\n` + blocks.join("\n"));
    }
    out.push({ to: lineId, text: parts.join("\n") });
  }
  return out;
}

// --- Weekly summary: last 7 days, gentle stats (deterministic — no AI) ---
async function buildWeekly(now: Date) {
  const since = new Date(now.getTime() - 7 * DAY);
  const patients = await db.patient.findMany({
    where: { caregivers: { some: {} } },
    include: {
      caregivers: { select: { lineId: true } },
      observations: { where: { at: { gte: since } }, select: { category: true, severity: true } },
      weights: { where: { at: { gte: since } }, orderBy: { at: "asc" }, select: { kg: true } },
    },
  });

  const { add, buckets } = digestSender();
  for (const p of patients) {
    const obs = p.observations;
    if (obs.length === 0 && p.weights.length === 0) continue; // nothing happened this week
    const concerns = obs.filter((o) => (o.severity ?? 0) >= 5).length;
    const good = obs.filter((o) => o.category === "เรื่องดี").length;
    const lines = [`📋 สรุปสัปดาห์นี้ · ${p.name}`];
    if (p.weights.length) {
      const first = p.weights[0].kg, last = p.weights[p.weights.length - 1].kg;
      const d = last - first;
      const trend = Math.abs(d) < 0.1 ? "" : ` (${d < 0 ? "↘" : "↗"} ${Math.abs(d).toFixed(1)} กก.)`;
      lines.push(`• น้ำหนักล่าสุด: ${last} กก.${trend}`);
    }
    lines.push(`• บันทึกอาการ: ${obs.length} ครั้ง${concerns ? ` (น่าห่วง ${concerns})` : ""}`);
    if (good) lines.push(`• วันดีๆ: ${good} ครั้ง 🌿`);
    lines.push("ดูละเอียดในแอปได้เลยค่ะ");
    for (const c of p.caregivers) add(c.lineId, lines.join("\n"));
  }
  // one weekly message per user (join multiple patients' blocks)
  return [...buckets].map(([to, blocks]) => ({ to, text: blocks.join("\n\n") }));
}

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const round = sp.get("round") === "evening" ? "evening" : "morning";
  const preview = sp.get("preview") === "1";
  const now = new Date();

  const messages = await buildDaily(now, round);
  // Weekly summary rides the Monday morning run — keeps us within 2 Vercel crons.
  const weekly = sp.get("weekly") === "1" || (round === "morning" && bkkDayOfWeek(now) === 1);
  if (weekly) messages.push(...(await buildWeekly(now)));

  const results = [];
  for (const m of messages) {
    if (preview) results.push({ to: m.to, preview: m.text });
    else {
      const r = await pushLine(m.to, m.text);
      results.push({ to: m.to, ok: r.ok, status: r.status });
    }
  }
  return NextResponse.json({ ranAt: now.toISOString(), round, weekly, preview, count: results.length, results });
}
