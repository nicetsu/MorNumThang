import { db } from "@/lib/db";

// LINE Messaging API push. Server-side only — the channel access token is a secret.
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Push one text message to a LINE userId. Returns {ok} — never throws, so one failed
// recipient (e.g. hasn't added the OA) doesn't abort the whole reminder run.
export async function pushLine(to: string, text: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  if (!TOKEN) return { ok: false, status: 0, body: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN" };
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => "");
  console.warn("[line] push failed", { to, status: res.status, body });
  return { ok: false, status: res.status, body };
}

// Notify every caregiver linked to a patient. Never throws — a failed push must not
// block the save. Skips freeform /enter codes (e.g. "demo") that aren't real LINE
// userIds. Push only works for users who've added the Official Account as a friend.
export async function notifyCaregivers(patientId: string, text: string): Promise<void> {
  if (!TOKEN) {
    console.warn("[line] skip notify — LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }
  const patient = await db.patient.findUnique({
    where: { id: patientId },
    select: { caregivers: { select: { lineId: true } } },
  });
  if (!patient) return;
  const targets = patient.caregivers.filter((c) => c.lineId.startsWith("U"));
  if (!targets.length) {
    console.warn("[line] skip notify — no caregivers with a real LINE userId (U…)");
    return;
  }
  for (const c of targets) await pushLine(c.lineId, text);
}

export function medNotifyMessage(
  name: string,
  schedules: { whenTime: string; dose: number }[],
  remaining: number | null,
): string {
  const lines = ["หมอนำทาง · เพิ่มยาใหม่", name];
  for (const s of schedules) lines.push(`${s.whenTime} · ${s.dose} เม็ด`);
  if (remaining != null) lines.push(`เหลือ ${remaining} เม็ด`);
  return lines.join("\n");
}
