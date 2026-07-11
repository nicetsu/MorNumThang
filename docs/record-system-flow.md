# Record System Flow — หมอนำทาง

แผนภาพการทำงานของระบบบันทึก (Observation + WeightLog) และการคิดคะแนน doctor-score.

```mermaid
flowchart TD
    subgraph WRITE["📝 บันทึกข้อมูล (Write)"]
        direction TB
        U([ผู้ดูแล/ลูก])

        subgraph NARR["เล่าอาการ — /logs · NarrativeRecord"]
            S1["พิมพ์เรื่องเล่า (story)"]
            B1["กด 'ช่วยจัดลงสมุด'"]
            ACT1["organizeNarrativeAction()"]
            AI["organizeNarrative()<br/>lib/ai.ts"]
            LLM[["LLM · Ollama<br/>ThaiLLM-8B-MedApp"]]
            CLAMP["clampSeverity 0–10<br/>(default 5, fallback = ทั้งเรื่อง)"]
            REVIEW{"ตรวจก่อนบันทึก<br/>แก้ / ลบ ได้"}
            B2["กด 'ถูกต้อง บันทึกลงสมุด'"]
            SAVE["saveObservations()<br/>กรอง text ว่าง"]
        end

        subgraph WT["น้ำหนัก/ความดัน — addWeight()"]
            W1["submit form"]
            WP["parseWeight + optInt<br/>(ช่วงที่สมเหตุผล)"]
        end
    end

    subgraph DB["🗄️ Prisma / SQLite"]
        OBS[("Observation<br/>category · text · severity")]
        WLOG[("WeightLog<br/>kg · bp · pulse")]
    end

    subgraph READ["📊 วิเคราะห์ & แสดงผล (Read)"]
        direction TB
        Q["query severities ล่าสุด<br/>(/signals = 7 วันล่าสุด)"]
        BAND["severityBand()<br/>0–3→1 · 4–7→2 · 8–10→3"]
        SCORE["scoreLevel()<br/>= round(avg ของ band)"]
        LVL["LEVEL 0–3<br/>badge + สี + คำไทย"]
        DOT["dotClass()<br/>จุดสีในไทม์ไลน์"]
        UI([doctor-score + timeline])
    end

    U --> S1 --> B1 --> ACT1 --> AI --> LLM --> AI --> CLAMP --> REVIEW
    REVIEW -->|ยืนยัน| B2 --> SAVE --> OBS
    REVIEW -.->|ปิด/รีเฟรช = ไม่บันทึก| X((ทิ้ง))

    U --> W1 --> WP --> WLOG

    OBS --> Q --> BAND --> SCORE --> LVL --> UI
    OBS --> DOT --> UI
    WLOG -.-> UI

    style LLM fill:#F2A93B,color:#000
    style REVIEW fill:#D96C4F,color:#fff
    style OBS fill:#1F6E63,color:#fff
    style WLOG fill:#1F6E63,color:#fff
    style SCORE fill:#1F6E63,color:#fff
```

## หลักการที่แผนภาพสะท้อน

- **AI ไม่ auto-save** — ถ้าไม่กด "ถูกต้อง บันทึกลงสมุด" ข้อมูลอยู่แค่ `useState` แล้วหายไป
- **LLM แตะแค่ severity รายข้อ (0–10)** — การรวมคะแนน (`severityBand` → `scoreLevel`) เป็น deterministic code ไม่ผ่านโมเดล (AGENTS.md rule 2)
- **น้ำหนัก/ความดัน** บันทึกจังหวะเดียว ไม่มีขั้นตรวจทาน

## ไฟล์อ้างอิง

| ส่วน | ไฟล์ |
|------|------|
| ฟอร์ม/ตรวจทาน | `app/logs/narrative-record.tsx` |
| server actions | `app/logs/actions.ts` |
| เรียกโมเดล + clamp | `lib/ai.ts` |
| คิดคะแนน/แบ่งแถบสี | `lib/severity.ts` |
| แสดง doctor-score | `app/page.tsx`, `app/signals/page.tsx` |
