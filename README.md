# หมอนำทาง (Mor Num Thang)

แอปช่วยลูกดูแลม้า (ผู้สูงอายุ): น้ำหนัก ยา ยาที่แพ้ นัดหมอ บันทึกการไปหาหมอ และสรุปข้อมูลให้หมอ

**อ่านก่อนเริ่มทำงาน:** [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) มีกฎของโปรเจกต์ (โดยเฉพาะเรื่องความปลอดภัยของ AI),
[PLAN.md](PLAN.md) มีแผนงานทั้งหมด, [MISTAKES.md](MISTAKES.md) มีบทเรียนจากความผิดพลาดที่เคยเกิด — ควรอ่านก่อนแก้โค้ด

## สแตก

Next.js (App Router, TS) + Tailwind + shadcn/ui + Prisma 7/SQLite + AI ผ่าน Ollama (OpenAI-compatible)
+ ฟีเจอร์ถ่ายรูปสแกน (ยา/ใบนัด) ผ่าน OpenCV + PaddleOCR (Python sidecar แยกต่างหาก) + Qwen

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

### 2) Ollama (จำเป็นสำหรับฟีเจอร์ AI ทั้งหมด)

ต้องมี [Ollama](https://ollama.com) รันอยู่ในเครื่อง พร้อมโมเดล 2 ตัว (ชื่อโมเดลตั้งได้ผ่าน `.env`):

```bash
ollama pull llama3.2           # AI_MODEL — สรุปให้หมอ / health signals / care guide
ollama pull qwen2.5-coder:7b   # OCR_STRUCTURE_MODEL — แปลงข้อความจากรูปเป็นข้อมูลฟอร์ม
```

### 3) OCR sidecar (จำเป็นเฉพาะฟีเจอร์ "ถ่ายรูปสแกน" — เพิ่มยา/เพิ่มนัดจากรูปฉลากยา/ใบนัด)

Python 3.10+ แยกต่างหากจากฝั่งเว็บ:

```bash
cd ocr-service
python -m venv venv && venv\Scripts\activate   # หรือ source venv/bin/activate บน mac/linux
pip install -r requirements.txt
cd ..
./scripts/start-ocr.sh          # รันที่ :8008 (โหลดโมเดล PaddleOCR ครั้งแรกใช้เวลาสักครู่)
```

ถ้าไม่ได้รันฟีเจอร์สแกน ไม่ต้องเปิด service นี้ก็ได้ — ส่วนที่เหลือของแอปใช้งานได้ปกติ

## คำสั่งที่ใช้บ่อย

```bash
npm run dev                 # dev server
npx prisma migrate dev      # apply schema changes
npx prisma studio           # ดูข้อมูลในฐานข้อมูล
npx shadcn@latest add X     # เพิ่ม UI component (เฉพาะตอนใช้จริง)
./scripts/ai-status.sh      # เช็คว่า Ollama/endpoint พร้อมไหม
```

## ให้คนอื่นเข้าถึงจากมือถือ (dev เท่านั้น)

`next.config.ts` มี `allowedDevOrigins` ล็อกไว้เฉพาะ IP ที่ใช้ทดสอบตอนพัฒนา — ถ้า IP เครื่องเปลี่ยน (DHCP)
ต้องแก้ IP ในไฟล์นั้นแล้ว restart `npm run dev` ใหม่ ไม่งั้นหน้าเว็บจะโหลดขึ้นแต่กดปุ่มอะไรไม่ติดเลย
(ดูรายละเอียดใน [MISTAKES.md](MISTAKES.md))

## โครงสร้างโปรเจกต์

```
app/            routes/screens + Server Actions; app/api/ai, app/api/meds/scan, app/api/appointments/scan
components/     shadcn ui/ + app components
lib/            ai.ts (Ollama client), db.ts (prisma), ocr.ts (เรียก ocr-service), allergy.ts (deterministic checks)
prisma/         schema.prisma, migrations, seed.ts
ocr-service/    Python FastAPI sidecar: OpenCV preprocess -> PaddleOCR -> ข้อความดิบ
mornumthang2/   ต้นแบบ static (index.html/app.js/styles.css) — ใช้เป็น design reference
```
