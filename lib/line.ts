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
  return { ok: false, status: res.status, body: await res.text().catch(() => "") };
}

// Notify every caregiver linked to a patient. Never throws — a failed push must not
// block the appointment save. Skips freeform /enter codes (e.g. "demo") that aren't
// real LINE userIds. Patient.lineId (คนถูกดูแล) comes later.
export async function notifyCaregivers(patientId: string, text: string): Promise<void> {
  const patient = await db.patient.findUnique({
    where: { id: patientId },
    select: { caregivers: { select: { lineId: true } } },
  });
  if (!patient) return;
  for (const c of patient.caregivers) {
    // Real LINE userIds start with "U"; freeform enter codes do not.
    if (!c.lineId.startsWith("U")) continue;
    await pushLine(c.lineId, text);
  }
}
