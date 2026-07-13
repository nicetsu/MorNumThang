"""OCR sidecar: Camera photo -> OpenCV cleanup -> PaddleOCR -> raw text.
Called by the Next.js app server-side only (lib/ocr.ts). Never exposed to the browser directly.

# ponytail: mkldnn disabled — this paddlepaddle 3.3.1 CPU build throws
# "ConvertPirAttribute2RuntimeAttribute not support ArrayAttribute<DoubleAttribute>"
# under the new PIR executor with mkldnn on for th_PP-OCRv5_mobile_rec. CPU-only, no GPU here anyway.
"""
import os

os.environ.setdefault("FLAGS_use_mkldnn", "0")

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR

app = FastAPI()

# Loaded once at startup — model init is slow (downloads on first run), reused across requests.
# ponytail: DO NOT swap text_detection_model_name to "PP-OCRv5_mobile_det" for speed — tried it,
# it's ~6x faster (~2s vs ~11.5s warm) but catastrophically misreads some real layouts (a clean
# appointment-slip test image came back as pure garbage: "ALELNLBMCEY..." instead of Thai text).
# "server_det" is the accurate default for lang="th"; keep it even though it's slower. Correctness
# beats speed here — a hallucinated/garbled hospital or drug name is a safety problem, not a UX one.
_ocr = PaddleOCR(
    lang="th",
    device="cpu",
    enable_mkldnn=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=True,
)

MAX_DIM = 1600


def preprocess(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("decode failed")

    h, w = img.shape[:2]
    scale = MAX_DIM / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # denoise + contrast boost (CLAHE on the L channel) — helps with faint print / glare on labels
    img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr(image: UploadFile = File(...)):
    raw = await image.read()
    try:
        processed = preprocess(raw)
    except ValueError:
        return JSONResponse({"error": "อ่านไฟล์รูปไม่ได้"}, status_code=400)

    results = _ocr.predict(processed)
    lines: list[str] = []
    for r in results:
        lines.extend(r.get("rec_texts", []))

    return {"text": "\n".join(lines), "lines": lines}
