#!/usr/bin/env bash
# เช็คสถานะ AI: โมเดลที่แอปใช้ / โมเดลที่โหลดใน RAM / tunnel / เข้าถึงได้ไหม
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

echo "== แอปตั้งค่าจะใช้ (.env) =="
grep -E '^AI_(BASE_URL|MODEL)=' "$ENV_FILE"

echo; echo "== โหลดอยู่ใน RAM ตอนนี้ (ollama ps) =="
ollama ps

echo; echo "== tunnel ที่รันอยู่ =="
pgrep -fl "cloudflared tunnel" || echo "ไม่มี tunnel"

echo; echo "== เข้าถึง endpoint ได้ไหม =="
URL=$(grep '^AI_BASE_URL=' "$ENV_FILE" | sed -E 's/^AI_BASE_URL="?([^"]*)"?.*/\1/')
if curl -s -m 8 "$URL/models" -H "Authorization: Bearer ollama" >/dev/null 2>&1; then
  echo "OK  $URL"
else
  echo "เข้าไม่ถึง  $URL  (ลอง ./scripts/start-ai.sh)"
fi
