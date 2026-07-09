#!/usr/bin/env bash
# เปิด cloudflared tunnel ตัวเดียวชี้ไปที่ Ollama ในเครื่อง แล้วเขียน URL ใหม่ลง .env
# ponytail: URL ของ trycloudflare เปลี่ยนทุกครั้งที่ restart จึงต้องเขียนกลับ .env อัตโนมัติ
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
LOG="/tmp/mnt-cloudflared.log"

# Ollama ต้องรันก่อน (โมเดลจะโหลดเองตอนมี request แรก)
curl -s -m 3 http://localhost:11434/api/tags >/dev/null 2>&1 \
  || { echo "Ollama ไม่ได้รัน — เปิดแอป Ollama หรือ 'ollama serve' ก่อน"; exit 1; }

# ปิด tunnel เดิมทั้งหมด (กันซ้อน) แล้วเปิดใหม่ตัวเดียว
pkill -f "cloudflared tunnel --url http://localhost:11434" 2>/dev/null || true
sleep 1

: > "$LOG"
nohup cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434 >"$LOG" 2>&1 &
echo "cloudflared pid $!"

# รอ URL โผล่ในล็อก
URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "ไม่ได้ URL ใน 30 วิ — ดูล็อก $LOG"; exit 1; }

# เขียนลง .env (แทนบรรทัด AI_BASE_URL)
if grep -q '^AI_BASE_URL=' "$ENV_FILE"; then
  sed -i '' "s#^AI_BASE_URL=.*#AI_BASE_URL=\"$URL/v1\"#" "$ENV_FILE"
else
  echo "AI_BASE_URL=\"$URL/v1\"" >> "$ENV_FILE"
fi
echo "ตั้ง AI_BASE_URL = $URL/v1"
echo "เสร็จแล้ว — ถ้าแอปรันอยู่ให้ restart 'npm run dev' เพื่อโหลด .env ใหม่"
