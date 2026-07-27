# หมอนำทาง (Mor Num Thang)

แอปช่วยลูกดูแลม้า (ผู้สูงอายุ): น้ำหนัก/สัญญาณชีพ ยา ยาที่แพ้ นัดหมอ บันทึกอาการประจำวัน สิทธิการรักษา
และสรุปข้อมูลให้หมอ · เข้าใช้งานผ่าน LINE (LIFF) · UI ไทยล้วน ปุ่มใหญ่ อ่านง่าย

**อ่านก่อนเริ่มทำงาน:** [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) มีกฎของโปรเจกต์ (โดยเฉพาะเรื่องความปลอดภัยของ AI),
[MISTAKES.md](MISTAKES.md) มีบทเรียนจากความผิดพลาดที่เคยเกิด — ควรอ่านก่อนแก้โค้ด
([PLAN.md](PLAN.md) เป็นแผนตั้งต้น ตอนนี้เป็นเอกสารเชิงประวัติแล้ว — โค้ดคือแหล่งอ้างอิงจริง)

## สแตก

Next.js 16 (App Router, TS) + Tailwind v4 + shadcn/ui (ฐานเป็น Base UI ไม่ใช่ Radix)
+ Prisma 7 / **PostgreSQL (Supabase)** + AI ผ่าน OpenAI-compatible endpoint (server-side เท่านั้น) · deploy บน Vercel

AI แยกเป็น 2 เลน: **TEXT** (สรุป/จัดหมวด/แนะนำสิทธิ) กับ **VISION** (ถ่ายรูปสแกนฉลากยา/ใบนัด)
เลือก provider ได้จาก env — ดู `PRESETS` ใน [lib/ai.ts](lib/ai.ts)

## เริ่มต้นใช้งาน (ครั้งแรก)

```bash
npm install
cp .env.example .env        # แล้วกรอกค่าจริง (อย่างน้อย DATABASE_URL + คีย์ AI ฝั่ง TEXT)
npx prisma generate
npx prisma migrate deploy   # ⚠️ ไม่ใช่ migrate dev — dev/prod ใช้ DB Supabase ตัวเดียวกัน
npx prisma db seed          # รันซ้ำได้ ไม่ล้างข้อมูลเดิม
npm run dev                 # http://localhost:3000
```

เข้าครั้งแรกจะเจอหน้า `/enter` — พิมพ์รหัส `demo` เพื่อ login เป็นผู้ดูแลตัวอย่าง (ถ้ายังไม่ได้ตั้ง LIFF)

### ฐานข้อมูล

ใช้ Supabase Postgres ตัวเดียวทั้ง dev และ prod ตอนแก้ schema ให้:

```bash
npx prisma migrate dev --create-only   # เขียนไฟล์ migration (ไม่แตะข้อมูล)
npx prisma migrate deploy              # ค่อย apply
```

**ห้ามรัน `prisma migrate reset` หรือ `migrate dev` เปล่า ๆ** — ข้อมูลที่ใช้อยู่จริงจะหาย

### AI (จำเป็นสำหรับฟีเจอร์ AI ทั้งหมด)

ค่า default คือ typhoon-8b (ไทย, เลน TEXT) + glm-4.5v (มองรูป, เลน VISION) ตั้งใน `.env`:

```env
AI_PROVIDER="thaillm"       # thaillm | zai | nvidia
THAILLM_API_KEY="xxxxx"
VISION_PROVIDER="zai"
ZAI_API_KEY="xxxxx"
```

จะ override รายค่าเองก็ได้ (`AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` และชุด `VISION_*`)
ทุกการเรียกโมเดลอยู่ฝั่งเซิร์ฟเวอร์ **ห้ามใส่ key ใน client component หรือ commit `.env`**

> โมเดล TEXT ตัวเล็ก (8B) — เวลาแก้ prompt ให้ทดสอบกับโมเดลจริงเสมอ มีสคริปต์ eval ให้ใน `scripts/`
> (`risk-eval.mts`, `severity-eval.mts`) และบทเรียนที่เคยพลาดอยู่ใน [MISTAKES.md](MISTAKES.md)

### LINE (ไม่ใส่ก็รันได้ แต่จะ login ด้วยรหัสแทน)

```env
NEXT_PUBLIC_LIFF_ID="xxxxx-xxxxx"    # ตัวเดียวที่ client เห็น
LINE_LOGIN_CHANNEL_ID="xxxxx"        # ใช้ verify id_token
LINE_CHANNEL_ACCESS_TOKEN="xxxxx"    # push แจ้งเตือน + สลับ rich menu
LINE_RICHMENU_MEMBER="richmenu-xxxxx"
CRON_SECRET="xxxxx"                  # กัน /api/cron/reminders ถูกยิงจากข้างนอก
```

แจ้งเตือนรายวันตั้งไว้ใน [vercel.json](vercel.json) — รอบเช้า 07:00 และรอบเย็น 19:00 เวลาไทย

## คำสั่งที่ใช้บ่อย

```bash
npm run dev                  # dev server
npm run build                # prisma generate + next build
npx prisma studio            # ดูข้อมูลในฐานข้อมูล
npx shadcn@latest add X      # เพิ่ม UI component (เฉพาะตอนใช้จริง)
```

### เทส

เป็นไฟล์ `node:assert` ธรรมดา รันตรง ๆ ไม่มี test runner และไม่มี `npm test`:

```bash
node --experimental-strip-types lib/risk.test.mts
```

ไฟล์ที่ผ่าน: `lib/{risk,severity,allergy,rights,meds}.test.mts`, `app/logs/weight.test.mts`
(ถูก exclude จาก `tsconfig.json` → `next build` ไม่จับให้ ต้องรันเองหลังแก้ logic ความปลอดภัย)

⚠️ `lib/ai.test.mts` รันไม่ผ่านตอนนี้ (`ERR_MODULE_NOT_FOUND`) เพราะ `lib/ai.ts` import `./risk` แบบไม่มีนามสกุล
และใช้ alias `@/lib/meds` ซึ่ง node เปล่า ๆ resolve ไม่ได้ — เหตุผลเดียวกับที่ `lib/risk.ts` ตั้งใจไม่ import อะไรเลย

## ให้คนอื่นเข้าถึงจากมือถือ (dev เท่านั้น)

`next.config.ts` มี `allowedDevOrigins` ล็อกไว้เฉพาะ IP ที่ใช้ทดสอบตอนพัฒนา — ถ้า IP เครื่องเปลี่ยน (DHCP)
ต้องแก้ IP ในไฟล์นั้นแล้ว restart `npm run dev` ใหม่ ไม่งั้นหน้าเว็บจะโหลดขึ้นแต่กดปุ่มอะไรไม่ติดเลย

## โครงสร้างโปรเจกต์

```
app/            routes/screens + Server Actions (actions.ts วางคู่กับหน้า)
  api/ai        สตรีม AI: summary | signals | care | rights
  api/meds/scan · api/appointments/scan     สแกนรูปฉลากยา / ใบนัด
  api/auth/line · api/cron/reminders        LINE login · แจ้งเตือนรายวัน
components/     app components + ui/ (shadcn บน Base UI)
lib/            ai.ts · db.ts · patient.ts (cookie/สโคปผู้ใช้) · line.ts
                + โมดูลตัดสินใจแบบ deterministic: allergy · risk · severity · rights · free-meds · infer
prisma/         schema.prisma, migrations, seed.ts, rights-data.json
scripts/        risk-eval.mts, severity-eval.mts (eval prompt), import_rights.py
docs/           risk-score-plan.md, record-system-flow.md
mornumthang2/   ต้นแบบ static (index.html/app.js/styles.css) — ใช้เป็น design reference
```

## หลักการที่ห้ามแตะ

**AI ไม่เคยตัดสินเรื่องความปลอดภัย** — การแพ้ยา คะแนนความเสี่ยง สิทธิการรักษา และการคำนวณวันที่ อยู่ใน
โค้ด deterministic ที่มีเทสกำกับทั้งหมด โมเดลทำแค่เรียบเรียง จัดหมวด และอ่านรูป · ผลลัพธ์จาก AI ต้องมี
disclaimer เสมอ · รายละเอียดอยู่ใน [AGENTS.md](AGENTS.md)
