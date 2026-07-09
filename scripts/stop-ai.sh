#!/usr/bin/env bash
# ปิด cloudflared tunnel (ปล่อย Ollama ทำงานต่อ — มันกิน RAM เฉพาะตอนโมเดลถูกโหลด)
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
if pkill -f "cloudflared tunnel --url http://localhost:11434" 2>/dev/null; then
  echo "ปิด tunnel แล้ว"
else
  echo "ไม่มี tunnel ที่รันอยู่"
fi
# ปลดโมเดลออกจาก RAM ด้วย (ออปชัน): เอา comment ออกถ้าต้องการ
# ollama stop hf.co/mradermacher/ThaiLLM-8B-MedApp-GGUF:Q4_K_M 2>/dev/null || true
