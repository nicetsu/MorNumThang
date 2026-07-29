# Deployment — หมอนำทาง

สภาพแวดล้อมจริงและกับดักที่เจอมาแล้ว อ่านก่อนแตะอะไรที่เกี่ยวกับ production

## ที่อยู่ของทุกอย่าง

| ส่วน | ที่ไหน |
|---|---|
| Repo | `git@github.com:nicetsu/BDI_BKK.git` (private) |
| Hosting | Vercel — production URL: **https://bdi-bkk.vercel.app** |
| Database | Supabase Postgres · region `ap-southeast-1` (Singapore) |
| TEXT AI | thaillm.or.th (`typhoon-s-thaillm-8b-instruct`) — ใช้งานได้ |
| VISION AI | **ยังใช้งานไม่ได้** — ดูหัวข้อ "สถานะ VISION" ด้านล่าง |
| LINE | LINE Login channel + Messaging API channel (สร้างผ่าน LINE Official Account Manager) + LIFF app |
| Cron | `vercel.json` — เช้า 07:00 / เย็น 19:00 เวลาไทย (`0 0` และ `0 12` UTC) |

## Environment variables

`lib/db.ts` เลือก `DATABASE_URL` ก่อน แล้วค่อย fallback ไป `POSTGRES_PRISMA_URL` ของ Supabase integration

| ตัวแปร | ในเครื่อง (.env) | บน Vercel | หมายเหตุ |
|---|---|---|---|
| `DATABASE_URL` | **port 5432** (session pooler) | **port 6543** (transaction pooler) | ⚠️ ต่างกัน — ดู "กับดัก #2" |
| `AI_PROVIDER` / `AI_MODEL` / `THAILLM_API_KEY` | ✅ | ✅ | เลน TEXT |
| `VISION_PROVIDER` / `ZAI_API_KEY` / `GEMINI_API_KEY` | ✅ (แต่ใช้ไม่ได้) | ❌ ยังไม่ได้ตั้ง | ดู "สถานะ VISION" |
| `CRON_SECRET` | ✅ | ✅ | ต้องตรงกัน ไม่งั้น cron โดน 401 |
| `NEXT_PUBLIC_LIFF_ID` | ❌ | ✅ | ตัวเดียวที่ client เห็น |
| `LINE_LOGIN_CHANNEL_ID` | ❌ | ✅ | verify id_token |
| `LINE_CHANNEL_ACCESS_TOKEN` | ❌ | ✅ | push แจ้งเตือน |
| `LINE_RICHMENU_MEMBER` | ❌ | ❌ | optional — โค้ดกันไว้แล้ว (`app/api/auth/line/route.ts`) |

---

## กับดักที่เจอมาแล้ว

### #1 — Vercel บล็อก deploy ถ้า commit author ไม่ใช่เจ้าของบัญชี

**อาการ:** push ผ่าน build ในเครื่องผ่าน แต่ไม่มี deploy เกิดขึ้น ได้อีเมล
*"X attempted to deploy a commit to nicetsu … but they're not a member of the team"*

**สาเหตุ:** Vercel แผนฟรี (Hobby) build เฉพาะ commit ที่ author ตรงกับเจ้าของบัญชี เครื่องนี้เคยตั้ง
`git config user.email` เป็นอีเมลของ GitHub อีกบัญชีหนึ่ง

**แก้:** ตั้ง author ของ repo นี้ให้ตรงกับบัญชีที่เป็นเจ้าของ Vercel

```bash
git config user.email "133124447+nicetsu@users.noreply.github.com"
```

(รูปแบบ noreply ของ GitHub = `<user-id>+<login>@users.noreply.github.com` หาได้จาก GitHub → Settings → Emails)

**ตรวจก่อน push:**
```bash
gh api repos/nicetsu/BDI_BKK/commits/HEAD --jq .author.login   # ต้องได้ nicetsu
```

### #2 — Supabase pooler: 5432 กับ 6543 ใช้คนละงาน

**อาการ:** เว็บขึ้น "This page couldn't load — A server error occurred" (runtime error ไม่ใช่ build error)
รัน `npx prisma db pull` แล้วได้ `FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15`

**สาเหตุ:** ตั้ง `DATABASE_URL` บน Vercel เป็น session pooler (5432) ซึ่งรับได้แค่ 15 connection
พอเป็น serverless หลาย instance เปิด connection พร้อมกัน pool เต็มทันที

| Port | ชื่อ | ใช้กับ |
|---|---|---|
| **5432** | session pooler | `prisma migrate` / `db seed` — ต้องการ session lock + prepared statements |
| **6543** | transaction pooler | runtime บน Vercel — ทนหลาย connection พร้อมกัน |

**แก้:** Vercel env ใช้ 6543 · `.env` ในเครื่องคง 5432 ไว้สำหรับ migration

### #3 — ตรวจ deploy ด้วย curl หน้าเว็บไม่ได้

หน้าเกือบทั้งหมดผ่าน `middleware.ts` ที่เด้งไป `/enter` ถ้าไม่มี cookie `uid` → `curl` จะได้ 307 เสมอ
ไม่ว่า deploy จะสำเร็จหรือไม่

**ตรวจแบบถูกต้อง:**
```bash
gh api repos/nicetsu/BDI_BKK/deployments --jq '.[0].id'
gh api repos/nicetsu/BDI_BKK/deployments/<id>/statuses --jq '.[0].state'
```

หรือทดสอบ route ที่ไม่ต้อง login แต่แตะ DB:
```bash
curl -s -w "\n%{http_code}\n" "https://bdi-bkk.vercel.app/api/cron/reminders?round=morning&preview=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```
`preview=1` คำนวณข้อความให้ดูโดย**ไม่ส่ง LINE จริง** — ปลอดภัยสำหรับทดสอบ

---

## สถานะ VISION (สแกนฉลากยา / ใบนัด) — ยังใช้งานไม่ได้

`lib/ai.ts` มี preset ให้เลือก 4 ตัว แต่ยังไม่มีตัวไหนที่มีคีย์ใช้งานได้จริง:

| Preset | โมเดล | สถานะที่ทดสอบจริง |
|---|---|---|
| `zai` (default) | `glm-4.5v` | คีย์ valid แต่บัญชีไม่มีเครดิต → `429 {"code":"1113","message":"Insufficient balance"}` |
| `gemini` | `gemini-2.0-flash` | คีย์ valid แต่ free tier quota = 0 → `429 RESOURCE_EXHAUSTED, limit: 0` (น่าจะต้องผูกบัตรกับ Google Cloud ก่อน) |
| `nvidia` | `google/diffusiongemma-26b-a4b-it` | ยังไม่ได้ทดสอบ — ยังไม่ได้สมัคร build.nvidia.com |
| `thaillm` | typhoon-8b | เป็นโมเดลข้อความล้วน **อ่านรูปไม่ได้** ใช้กับเลนนี้ไม่ได้ |

**ผลกระทบ:** ปุ่มสแกนรูปในหน้าเพิ่มยา/เพิ่มนัดจะใช้ไม่ได้ ฟีเจอร์อื่นทำงานปกติทั้งหมด
บน Vercel ยังไม่ได้ตั้ง `VISION_PROVIDER` เลย → default เป็น `zai` ที่ไม่มีเครดิต

**ทางแก้ที่เหลือ:** เติมเครดิต z.ai · ผูกบัตร Google Cloud · หรือสมัคร NVIDIA (มักมีเครดิตฟรีตอนสมัคร)

---

## ขั้นตอนที่ทำบ่อย

### แก้ schema
```bash
npx prisma migrate dev --create-only   # เขียนไฟล์ migration (ไม่แตะข้อมูล)
npx prisma migrate deploy              # apply — ใช้ DATABASE_URL 5432 ในเครื่อง
```
⚠️ **ห้าม `migrate reset` หรือ `migrate dev` เปล่า ๆ** — dev/prod ใช้ DB เดียวกัน ข้อมูลจริงจะหาย

### Deploy โค้ดใหม่
push ขึ้น `main` → Vercel deploy อัตโนมัติ (ตรวจ author ก่อนตาม #1)

### เปลี่ยนค่า env
แก้ใน Vercel Dashboard → Settings → Environment Variables → **ต้อง Redeploy** ถึงจะมีผล
(deployment เดิมใช้ค่าเดิมที่ inject ไว้ตอน build)

### ทดสอบ cron โดยไม่ส่ง LINE จริง
ใส่ `&preview=1` ใน query string (ดู #3)
