import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushLine } from "@/lib/line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TZ = "Asia/Bangkok";
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000; // Thailand is UTC+7, no DST

// Start of "today" in Bangkok, as a UTC instant.
function bkkTodayStart(now: Date): Date {
  const bkk = new Date(now.getTime() + BKK_OFFSET_MS);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - BKK_OFFSET_MS);
}

const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// One reminder bucket per ผู้ดูแล (keyed by lineId).
type Bucket = { appts: string[]; medsByPatient: Map<string, string[]> };

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the env var is set.
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const preview = req.nextUrl.searchParams.get("preview") === "1";

  const now = new Date();
  const start = bkkTodayStart(now);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000); // today + tomorrow (Bangkok)
  const todayKey = dayKeyFmt.format(now);

  const withCaregivers = { patient: { include: { caregivers: { select: { lineId: true } } } } };
  const [appts, meds] = await Promise.all([
    db.appointment.findMany({ where: { done: false, at: { gte: start, lt: end } }, include: withCaregivers }),
    db.medication.findMany({ include: withCaregivers }),
  ]);

  const buckets = new Map<string, Bucket>();
  const bucket = (lineId: string) => {
    let b = buckets.get(lineId);
    if (!b) buckets.set(lineId, (b = { appts: [], medsByPatient: new Map() }));
    return b;
  };

  for (const a of appts) {
    const when = dayKeyFmt.format(a.at) === todayKey ? "วันนี้" : "พรุ่งนี้";
    const line = `• ${a.patient.name}: ${a.note ?? "นัดหมอ"} ${when} ${timeFmt.format(a.at)}${a.place ? ` ที่ ${a.place}` : ""}`;
    for (const c of a.patient.caregivers) bucket(c.lineId).appts.push(line);
  }

  for (const m of meds) {
    const detail = [m.dose ? `${m.dose} เม็ด` : null, m.whenTime].filter(Boolean).join(" · ");
    const line = `• ${m.name}${detail ? ` · ${detail}` : ""}`;
    for (const c of m.patient.caregivers) {
      const byPatient = bucket(c.lineId).medsByPatient;
      (byPatient.get(m.patient.name) ?? byPatient.set(m.patient.name, []).get(m.patient.name)!).push(line);
    }
  }

  // Compose + send one digest per ผู้ดูแล that has something to say.
  const results: { to: string; ok?: boolean; status?: number; preview?: string }[] = [];
  for (const [lineId, b] of buckets) {
    if (b.appts.length === 0 && b.medsByPatient.size === 0) continue;
    const parts = ["🔔 หมอนำทาง · เตือนประจำวัน"];
    if (b.appts.length) parts.push("\n📅 นัดหมอ\n" + b.appts.join("\n"));
    if (b.medsByPatient.size) {
      const blocks = [...b.medsByPatient].map(([name, lines]) => `${name}\n${lines.join("\n")}`);
      parts.push("\n💊 ยาวันนี้\n" + blocks.join("\n"));
    }
    const text = parts.join("\n");
    if (preview) {
      results.push({ to: lineId, preview: text });
    } else {
      const r = await pushLine(lineId, text);
      results.push({ to: lineId, ok: r.ok, status: r.status });
    }
  }

  return NextResponse.json({ ranAt: now.toISOString(), preview, count: results.length, results });
}
