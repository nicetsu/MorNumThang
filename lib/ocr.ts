// Server-side only — talks to the local ocr-service sidecar (OpenCV + PaddleOCR), never called from the client.
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? "http://localhost:8008";

export class OcrServiceError extends Error {}

// Sends a photo of a drug label to the Python sidecar and gets back the raw recognized text.
export async function extractTextFromImage(image: Buffer, filename = "label.jpg"): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(image)]), filename);

  let res: Response;
  try {
    res = await fetch(`${OCR_SERVICE_URL}/ocr`, { method: "POST", body: form });
  } catch {
    throw new OcrServiceError("เปิดใช้งาน OCR service ก่อนนะคะ (ocr-service/ — ดู scripts/start-ocr.sh)");
  }

  if (!res.ok) {
    throw new OcrServiceError(`OCR service error: ${res.status}`);
  }
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? "";
}
