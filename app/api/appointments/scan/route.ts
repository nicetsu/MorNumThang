import { extractTextFromImage, OcrServiceError } from "@/lib/ocr";
import { structureAppointmentSlip, AI_DISCLAIMER } from "@/lib/ai";

// Camera → OpenCV/PaddleOCR sidecar → Qwen structuring. Server-side only (AGENTS.md rule 1).
// Read-only extraction: the caregiver still reviews/edits before anything is saved (rule 2).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "ไม่พบรูปภาพ" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractTextFromImage(buffer);
  } catch (e) {
    const message = e instanceof OcrServiceError ? e.message : "อ่านรูปไม่สำเร็จ ลองถ่ายใหม่อีกครั้งนะคะ";
    return Response.json({ error: message }, { status: 502 });
  }

  if (!rawText) {
    return Response.json({ error: "อ่านตัวอักษรจากรูปไม่ได้ ลองถ่ายให้ชัดขึ้นนะคะ" }, { status: 422 });
  }

  const slip = await structureAppointmentSlip(rawText);
  return Response.json({ ...slip, rawText, disclaimer: AI_DISCLAIMER });
}
