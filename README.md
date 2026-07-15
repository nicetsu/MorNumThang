# หมอนำทาง (Mor Num Thang)

แอปช่วยลูกดูแลม้า (ผู้สูงอายุ): น้ำหนัก ยา ยาที่แพ้ นัดหมอ บันทึกการไปหาหมอ และสรุปข้อมูลให้หมอ

**อ่านก่อนเริ่มทำงาน:** [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) มีกฎของโปรเจกต์ (โดยเฉพาะเรื่องความปลอดภัยของ AI),
[PLAN.md](PLAN.md) มีแผนงานทั้งหมด, [MISTAKES.md](MISTAKES.md) มีบทเรียนจากความผิดพลาดที่เคยเกิด — ควรอ่านก่อนแก้โค้ด

## สแตก

Next.js (App Router, TS) + Tailwind + shadcn/ui + Prisma 7/Postgres + AI ผ่าน OpenAI-compatible endpoint
+ DiffusionGemma ตัวเดียวสำหรับสรุป จัดหมวด และถ่ายรูปสแกนยา/ใบนัด (ไม่มี sidecar — รันบน Vercel ได้)

## เริ่มต้นใช้งาน (ครั้งแรก)

### 1) ฝั่งเว็บ (Next.js)

```bash
npm install
cp .env.example .env        # แล้วแก้ค่าตามจริงถ้าจำเป็น
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev                 # http://localhost:3000
```

### 2) NVIDIA API (จำเป็นสำหรับฟีเจอร์ AI ทั้งหมด)

สร้าง API key ที่ NVIDIA API Catalog แล้วตั้งค่าใน `.env`:

```env
AI_BASE_URL="https://integrate.api.nvidia.com/v1"
AI_MODEL="google/diffusiongemma-26b-a4b-it"
NVIDIA_API_KEY="nvapi-xxxxx"
```

ทุกฟีเจอร์ AI ใช้โมเดลเดียวกันฝั่งเซิร์ฟเวอร์ รวมถึงการอ่านรูปฉลากยาและใบนัด
ห้ามใส่ key ใน client component หรือ commit `.env`

## คำสั่งที่ใช้บ่อย

```bash
npm run dev                 # dev server
npx prisma migrate dev      # apply schema changes
npx prisma studio           # ดูข้อมูลในฐานข้อมูล
npx shadcn@latest add X     # เพิ่ม UI component (เฉพาะตอนใช้จริง)
./scripts/ai-status.sh      # เช็คว่า NVIDIA endpoint พร้อมไหม
```

## ให้คนอื่นเข้าถึงจากมือถือ (dev เท่านั้น)

`next.config.ts` มี `allowedDevOrigins` ล็อกไว้เฉพาะ IP ที่ใช้ทดสอบตอนพัฒนา — ถ้า IP เครื่องเปลี่ยน (DHCP)
ต้องแก้ IP ในไฟล์นั้นแล้ว restart `npm run dev` ใหม่ ไม่งั้นหน้าเว็บจะโหลดขึ้นแต่กดปุ่มอะไรไม่ติดเลย
(ดูรายละเอียดใน [MISTAKES.md](MISTAKES.md))

## โครงสร้างโปรเจกต์

```
app/            routes/screens + Server Actions; app/api/ai, app/api/meds/scan, app/api/appointments/scan
components/     shadcn ui/ + app components
lib/            ai.ts (AI client + vision scan), db.ts (prisma), line.ts (LINE push), allergy.ts (deterministic checks)
prisma/         schema.prisma, migrations, seed.ts
mornumthang2/   ต้นแบบ static (index.html/app.js/styles.css) — ใช้เป็น design reference
```
