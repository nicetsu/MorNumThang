#!/usr/bin/env bash
# เปิด OCR sidecar (OpenCV + PaddleOCR) ที่พอร์ต 8008 ให้ Next.js เรียกผ่าน OCR_SERVICE_URL
set -euo pipefail
cd "$(dirname "$0")/../ocr-service"

if curl -s -m 2 http://localhost:8008/health >/dev/null 2>&1; then
  echo "OCR service รันอยู่แล้วที่ :8008"
  exit 0
fi

echo "กำลังเปิด OCR service (โมเดล PaddleOCR จะโหลดครั้งแรกอาจใช้เวลาสักครู่)..."
python -m uvicorn main:app --host 0.0.0.0 --port 8008
