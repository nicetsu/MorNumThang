import { structureAppointmentSlip, AI_DISCLAIMER } from "@/lib/ai";

// Camera → vision model → structured fields. Server-side only (AGENTS.md rule 1).
// Read-only extraction: the caregiver still reviews/edits before anything is saved (rule 2).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "ไม่พบรูปภาพ" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

  try {
    const slip = await structureAppointmentSlip(dataUrl);
    if (!slip.date && !slip.time && !slip.hospital) {
      return Response.json({ error: "อ่านใบนัดจากรูปไม่ได้ ลองถ่ายให้ชัดขึ้นนะคะ" }, { status: 422 });
    }
    return Response.json({ ...slip, disclaimer: AI_DISCLAIMER });
  } catch {
    return Response.json({ error: "อ่านรูปไม่สำเร็จ ลองใหม่อีกครั้งนะคะ" }, { status: 502 });
  }
}
