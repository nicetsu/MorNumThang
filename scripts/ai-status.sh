#!/usr/bin/env bash
# เช็คโมเดลที่แอปใช้และการเข้าถึง NVIDIA endpoint โดยไม่แสดง API key
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

echo "== แอปตั้งค่าจะใช้ (.env) =="
grep -E '^AI_(BASE_URL|MODEL)=' "$ENV_FILE"

echo; echo "== เข้าถึง endpoint ได้ไหม =="
URL=$(grep '^AI_BASE_URL=' "$ENV_FILE" | sed -E 's/^AI_BASE_URL="?([^"]*)"?.*/\1/')
KEY=$(grep -E '^(NVIDIA_API_KEY|AI_API_KEY)=' "$ENV_FILE" | tail -1 | sed -E 's/^[^=]+="?([^"]*)"?.*/\1/')
if curl -s -m 8 "$URL/models" -H "Authorization: Bearer $KEY" >/dev/null 2>&1; then
  echo "OK  $URL"
else
  echo "เข้าไม่ถึง  $URL  (ตรวจ NVIDIA_API_KEY และเครือข่าย)"
  exit 1
fi
