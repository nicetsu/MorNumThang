# แผนอัปเกรดการคำนวณคะแนนความเสี่ยง (risk score)

สถานะ: **implement แล้วบางส่วน (live ใน 3 track)** · ที่มา: research รอบเบา (NEWS2) + deep-research (triage/red-flag/geriatric, 24/25 claims ยืนยัน)

> **สถานะ implement (2026-07-16):** `lib/risk.ts` + `lib/risk.test.mts` เสร็จ · WeightLog += temp/spo2 (W2) · doctor-score
> (หน้าแรก + /signals) = `max( อาการที่จด(worst-recent) , NEWS2 vitals≤48h , keyword-escalation 48h , weight-trend , persistence )`.
> **Live (deterministic):** NEWS2 vitals · symptom Class A/B danger sign · geriatric soft-sign (keyword net + negation guard เบา)
> · **W3 weight-loss trend** (ลด ≥5% ใน ~30 วัน → ควรสังเกต) · vocab ขยาย (synonym/คำพูดญาติ) · **W4 eval seed** (`risk.test.mts` — เคสไทยจริง + KNOWN_GAPS)
> · **W1 LLM-extraction union** — `organizeNarrative` สกัด canonical sign tags ตอน save (กรอง hallucination), เก็บ `Observation.signs`,
> **union กับ keyword net ตอนอ่าน** (LLM เพิ่ม recall ปิดวลีที่ keyword พลาด; code ยังตัดสิน band — rule 2). ปิด KNOWN_GAPS แล้ว.
>
> · **W5 context guard** — negation/hypothetical (marker หน้า: ไม่/กลัว/ถ้า) + resolved (marker หลัง: หายแล้ว/ดีขึ้น) ; เลี่ยงชน "หายใจ"
> · **persistence** — soft sign เรื้อรัง ≥3/7 วัน (ผู้สูงอายุ) → ควรปรึกษาหมอ (one-off ยังเป็นแค่ watch).
>
> **ตัดสินใจข้าม (ไม่ทำ):** active elicitation (W1b — UX, ผู้ใช้ยืนยันไม่ทำ) · **respRate/consciousness vitals**
> (ญาติวัด respRate ยาก data-quality ต่ำ; consciousness จับผ่าน soft-sign/Class A "หมดสติ" อยู่แล้ว — ไม่คุ้มเพิ่ม field).
>
> **เหลือ — ต้อง input ภายนอกเท่านั้น:** ① แพทย์ review threshold 🟠 ② ชุดข้อมูล labeled จริง (harness พร้อม).
>
> **ทำเองไม่ได้ — ต้อง input ภายนอก:** ① **แพทย์ review** threshold 🟠 (อายุ 70, soft เดี่ยว→เหลือง, weight 5%, band cutoffs)
> ② **ชุดข้อมูล labeled จริง** (เคสเล่าไทย + แพทย์ติดป้าย band) เพื่อวัด sensitivity/specificity ทั้ง pipeline (W4 harness มีโครงแล้ว รอข้อมูล).

## ปัญหาที่จะแก้
ปัจจุบัน AI ให้ `severity` 0–10 ต่ออาการ แล้ว band 8–10 = แดง → อาการธรรมดา (เช่น "ปวดท้อง")
เด้งแดงง่ายเกินไป (over-triage, alarm fatigue). ต้องการให้การขึ้นแดงอิงหลักฐานที่วัดได้ +
กติกาที่ตรวจสอบได้ ไม่ใช่ตัวเลขทึบจาก LLM (คง AGENTS.md rule 2 — deterministic เท่านั้นที่ตัดสินความปลอดภัย).

## แนวทาง: แยกเป็น 2 track อย่าให้ LLM คิดคะแนน
1. **Vital-sign risk = NEWS2** — นับแต้มจากค่าที่วัดได้ (auditable 100%)
2. **Symptom red-flag = rule table** — อาการธรรมดาไม่แดง เว้นแต่มี modifier อันตราย

LLM ทำแค่จัดหมวด/สกัดคำ (เช่น เจอ "อาเจียนเป็นเลือด" ไหม) แล้วส่งให้ code ตัดสิน.

## NEWS2 — ตารางนับแต้ม (ค่ามาตรฐาน RCP)
แอปเก็บ/track อยู่แล้ว: **ความดันตัวบน, ชีพจร, ไข้ (care task "วัดไข้"), SpO2 ("วัดออกซิเจนปลายนิ้ว")**
ที่ยังไม่มี: อัตราหายใจ, ระดับรู้สึกตัว (อาจเพิ่มเป็น care task/ช่องกรอกภายหลัง).

| พารามิเตอร์ | 3 | 2 | 1 | 0 |
|---|---|---|---|---|
| หายใจ/นาที | ≤8, ≥25 | 21–24 | 9–11 | 12–20 |
| SpO2 % | ≤91 | 92–93 | 94–95 | ≥96 |
| ให้ออกซิเจนเสริม | — | ใช่ | — | ไม่ |
| อุณหภูมิ °C | ≤35.0 | ≥39.1 | 35.1–36.0 / 38.1–39.0 | 36.1–38.0 |
| ความดันตัวบน mmHg | ≤90, ≥220 | 91–100 | 101–110 | 111–219 |
| ชีพจร/นาที | ≤40, ≥131 | 111–130 | 41–50 / 91–110 | 51–90 |
| ระดับรู้สึกตัว (ACVPU) | สับสนใหม่/ซึม/ไม่ตอบสนอง | — | — | รู้สึกตัวดี |

**แถบเสี่ยงจากคะแนนรวม:**
- 0 = ปกติ (เขียว)
- 1–4 = เฝ้าดู (เหลือง)
- 5–6 **หรือ** พารามิเตอร์เดี่ยวใดได้ 3 = ควรหาหมอ (แดง)
- ≥7 = ด่วนมาก (แดงเข้ม)

**กติกาสำคัญ:** "พารามิเตอร์เดี่ยว = 3 → แดงทันที" คือ safety net —
ค่าเดียวผิดปกติมากก็ escalate แม้คะแนนรวมต่ำ (รองรับ "ผู้สูงอายุอาการไม่ตรงไปตรงมา").

## mapping ที่จะเปลี่ยน (แทนของเดิม)
แทน "LLM 0–10 → 8–10 = แดง" ด้วย:
- **แดง** = NEWS2 รวม ≥5 **หรือ** พารามิเตอร์เดี่ยว = 3 **หรือ** symptom red-flag rule ยิง
- **เหลือง** = NEWS2 1–4 หรือมี watch-modifier
- **เขียว** = 0 / อาการธรรมดาไม่มี red-flag

ตัวอย่าง: "ปวดท้อง" vital ปกติ = เขียว/เหลือง · "ปวดท้อง + ไข้ 39 + ชีพจร 120" = NEWS2 สูง = แดงอัตโนมัติ.

## Symptom red-flag rules (track 2) — grounded จาก deep-research

**หลักการที่งานวิจัยยืนยัน (load-bearing):** "red flag" ถูกนิยามว่าเป็น **อาการร่วม (corroborating
danger sign) ที่ *เพิ่มขึ้นมา* นอกเหนือจากอาการหลัก** ไม่ใช่ตัวอาการหลักเอง → การขึ้นแดงต้อง "gate ด้วยการมี
danger sign ร่วม" ไม่ใช่ที่ตัวอาการที่มาเล่า. ความล้มเหลวหลักของ symptom checker คือ **ไม่ได้ถาม red flag**
(เจอแค่ 36.9% เทียบหมอ 71.8%, PMC12486864). และ **อาการเดี่ยวๆ ของปวดท้องมี diagnostic accuracy ต่ำ**
(แม้ตำราคลาสสิกอย่าง rebound/guarding/RLQ ก็ไม่ผ่านเกณฑ์เมื่ออยู่เดี่ยว) แต่ **combination แม่นกว่ามาก**
(integrated assessment LR+ 24.6, BJGP Open 2024) → ยืนยันโมเดล 2 ปัจจัย/ต้องมีอาการร่วมก่อนขึ้นแดง.

### แบ่งอาการเป็น 2 คลาส (สำคัญ — R5 ไม่ได้ใช้กับทุกอาการ)
อาการบางตัว**อันตรายในตัวเอง** ไม่ต้องรออาการร่วม จึงต้องแยกคลาส:

- **Class A — อันตรายในตัวเอง → แดงตั้งแต่มาเล่า (R5 ไม่ใช้ · ยิ่งผู้สูงอายุยิ่งต้อง):**
  เจ็บหน้าอก, หน้าเบี้ยว/แขนขาอ่อนแรง/พูดไม่ชัด (stroke — FAST), หายใจไม่ออกรุนแรง, ชัก, หมดสติ,
  อาเจียน/ถ่ายเป็นเลือดปริมาณมาก · *(สอดคล้อง PMC12486864: chest pain+cold sweat / headache+altered consciousness)*
- **Class B — ธรรมดา → ต้องมี danger sign ร่วม ≥1 ถึงแดง (R5 ใช้กลุ่มนี้):** ปวดท้อง, ปวดหัว, ไข้, ถ่ายเหลว/อาเจียน,
  ไอ/หายใจ, ปัสสาวะ, หกล้ม, ขาบวม — แต่ละอันมี danger-sign list **ของตัวเอง**

### ตาราง danger sign ต่ออาการ (Class B — LLM สกัดคำ, code ตัดสิน)

| อาการฐาน | danger sign ร่วม → แดง | ที่มา (grounded) |
|---|---|---|
| **ปวดท้อง** | อาเจียน/ถ่ายเป็นเลือด·ถ่ายดำ, ท้องแข็ง/เกร็ง (rigidity), กดปล่อยเจ็บ (rebound), ปวดรุนแรง/ต่อเนื่อง >2–3 ชม., ความดันตก, ไข้สูงร่วม | 🟢 BJGP Open 2024; AAFP |
| **ปวดหัว** | เฉียบพลันถึงจุดสูงสุดในนาที (thunderclap, >40% เป็นเลือดออกในสมอง), แขนขาอ่อนแรง/พูดไม่ชัด/ซึม (neuro), ไข้+คอแข็ง, **ปวดหัวใหม่อายุ >50** (GCA), pattern เปลี่ยน, ชัก, อาเจียนพุ่ง | 🟢 SNNOOP10 (JUCM/AAFP 2022) |
| **ไข้ / ติดเชื้อ** | ≥38.5–39°C หรือ **ต่ำผิดปกติ**, หนาวสั่น, ชีพจร >90, หายใจ >20, **สับสนเฉียบพลัน** · ⚠️ **ผู้สูงอายุ ~30% ไม่มีไข้ — confusion/ทรุดคือสัญญาณนำ (sepsis เงียบ)** | 🟢 sepsis red flags (elderly) |
| **ถ่ายเหลว/อาเจียน** | เลือดปน, ขาดน้ำ (ซึม·ปัสสาวะน้อย·ความดันตก·postural drop), กินน้ำไม่ได้หลายชม., ไข้สูง/ปวดท้องรุนแรงร่วม | 🟢 NICE CKS acute diarrhoea |
| **ไอ/หายใจ** | **หอบขณะพัก**, SpO2 <90–92%, ปากเขียว (cyanosis), พูดไม่จบประโยค/ใช้กล้ามเนื้อช่วยหายใจ, นอนราบไม่ได้ (orthopnea/PND), ไอเป็นเลือด, เจ็บหน้าอก/เป็นลมร่วม | 🟢 dyspnea red flags (Medscape/StatPearls) |
| **ปัสสาวะ** | ปัสสาวะไม่ออก (retention), ปวด+ไข้+หนาวสั่น/สับสน (urosepsis), เลือดปน · ⚠️ ผู้สูงอายุมัก confusion นำ | 🟢 UTI in older people (PMC5873814) |
| **หกล้ม** | หัวกระแทก/หมดสติ/สับสน/อาเจียน, **กินยาละลายลิ่มเลือด → CT แม้อาการเบา**, ลุกไม่ได้/ลงน้ำหนักไม่ได้ (กระดูกหัก), ล้มซ้ำ | 🟢 AAFP falls 2024; Merck |
| **ขาบวม** | บวม**ข้างเดียว**+ปวด/แดง/ร้อน (DVT — Wells), + เจ็บหน้าอก/หอบ (PE), บวมทั้งตัว+หอบ (หัวใจ) | 🟢 Wells DVT (MDCalc/StatPearls) |

🟢 = grounded กับแหล่งคลินิก (ส่วนใหญ่ตะวันตก/สากล — **ควร cross-check แนวทางไทย** สปสช./ราชวิทยาลัย ก่อน ship แต่ไม่ใช่ "แต่งเอง" แล้ว)
**cross-cutting จาก grounding:** ผู้สูงอายุที่ป่วยหนัก (sepsis/UTI) **มัก confusion/ทรุด แทนไข้** → ตอกย้ำ I3 (soft signs) ว่าจำเป็นจริง

**ซ้อนกับ geriatric (I3):** ผู้สูงอายุ + อาการ Class B + soft sign ก็ยกระดับได้แม้ danger sign หลักไม่ครบ.

**รูปแบบเก็บ:** `{ อาการฐาน → { class: A|B, dangerSigns: [keyword...], แหล่งอ้างอิง } }` + dictionary วลีไทยที่ญาติพิมพ์จริง
("อาเจียนเป็นเลือด", "ถ่ายดำ", "หน้าเบี้ยว"...) → flag. **การหาแหล่ง ground ต่ออาการของแถว 🟠 = งานที่ยังค้าง.**

## อายุ/ความเปราะบาง = แกน escalation แยกต่างหาก (สำคัญจาก deep-research)
งานวิจัยชี้ชัด: ระบบ triage มาตรฐาน (ESI/Manchester) **under-triage ผู้สูงอายุเป็นระบบ** (age ≥65:
OR under-triage 1.49–2.18, PMC8730791) เพราะผู้สูงอายุ**มาด้วยอาการไม่ตรงไปตรงมา** (53% atypical; ~ครึ่งของ
diverticulitis ไม่มีไข้) และ **frailty ทำนายการเสียชีวิต 30 วันโดยไม่ขึ้นกับระดับ urgency** (11.7% vs 3.4%
ทุกระดับ, JGS 2020). สรุป: **อายุ+โรคประจำตัวต้องเป็น modifier "บวกเพิ่ม" แยกต่างหาก ไม่ยุบรวมเป็นเลข severity เดียว**.
- **Charlson Comorbidity Index** — ถ่วงน้ำหนักโรคประจำตัว + อายุ (+1 ต่อทุก 10 ปี หลัง 50) ใช้เป็น frailty modifier
  (แอปมี `diseases` + `age` แล้ว). NEWS2 ก็ใช้กับผู้สูงอายุเปราะบางได้ (PMC7594283)

### I3 — Geriatric soft signs (ออกแบบแล้ว)
**หลักการ:** ในผู้สูงอายุ อาการคลุมเครือ (soft signs) *คือ* red flag เพราะป่วยหนักมักมาแบบ**ไม่มี classic sign**
(atypical presentation — NJM 53%, PMC4306086). ถ้ากติกายิงเฉพาะเมื่อมี classic danger sign จะ under-triage คนกลุ่มนี้.

**Soft-sign set** (map เข้าหมวดที่แอปเก็บอยู่แล้ว + chips หน้าบันทึกตรงพอดี):

| soft sign | คำที่ญาติมักพิมพ์ | หมวดแอป |
|---|---|---|
| **สับสน/เพ้อ (delirium)** | สับสน, เพ้อ, งง, จำไม่ได้, ซึม | อารมณ์/รู้สึกตัว |
| กินน้อยลง/ไม่กิน (anorexia) | ไม่กินข้าว, กินน้อยลงมาก, ไม่ดื่มน้ำ | การกิน |
| อ่อนแรง/ทำเองไม่ได้ (functional decline) | ลุกไม่ไหว, นอนซม, อ่อนเพลียมาก | การเดิน |
| ล้ม/เดินเซ (falls) | ล้ม, เดินเซ, ทรงตัวไม่ได้ | การเดิน |
| กลั้นปัสสาวะ/อุจจาระไม่อยู่ (ใหม่) | เพิ่งกลั้นไม่อยู่ | ขับถ่าย |
| "ไม่เหมือนเดิม" (generalized) | ไม่เหมือนเดิม, ไม่ค่อยรู้เรื่อง | อื่นๆ |

**กติกา (เฉพาะ อายุ ≥ 70 หรือ frailty สูง) — calibrate ไม่ให้ over-triage:**
```
สับสน/เพ้อเฉียบพลัน (delirium)                      → 🔴 แดง   (marker แรงสุด, เดี่ยวก็แดง)
    [NEWS2 จับผ่าน ACVPU=3 ถ้าประเมินระดับรู้สึกตัว — ทางนี้กันกรณีมีแต่คำเล่า]
soft sign ≥ 2 อย่าง  หรือ  soft sign + คำเฉียบพลัน/แย่ลง/หลายวัน ("เฉียบพลัน","มากขึ้น","2 วันแล้ว") → 🔴 แดง
soft sign เดี่ยว แบบเบา ("วันนี้กินน้อยลงนิดหน่อย")                                        → 🟡 เหลือง (watch)
```
**หัวใจ:** soft sign **เดี่ยว-เบา ไม่เด้งแดง** (กัน over-triage กลับมา) แต่ **หลายอย่างรวม / เฉียบพลัน / delirium = แดง**
— นั่นคือหน้าตาจริงของผู้สูงอายุที่ป่วยหนัก.

**เทสต์ยืนยัน (แก้ I3 โดยไม่ทำ over-triage พัง):**

| เคส | ผล | หมายเหตุ |
|---|---|---|
| 82 ปี · ไม่กินข้าว + ซึมลง + ไม่เหมือนเดิม (3 soft) | 🔴 | เดิม under-triage → แก้แล้ว |
| 80 ปี · สับสนเฉียบพลันวันนี้ | 🔴 | delirium |
| 80 ปี · ซึมลงมาก + ไม่กิน 2 วัน | 🔴 | acute + หลายวัน |
| 80 ปี · "วันนี้กินน้อยลงนิดหน่อย" (soft เดี่ยว เบา) | 🟡 | ไม่ over-triage |
| 60 ปี · กินน้อยลง (ไม่ใช่ผู้สูงอายุ) | 🟡 | กติกา geriatric ไม่ยิง |
| 78 ปี · ล้ม + เดินเซ (2 soft) | 🔴 | ล้มในผู้สูงอายุ = สัญญาณจริง |

**ต้องให้แพทย์ review (ยังไม่ปิด):**
- threshold **อายุ 70** — งานวิจัยใช้ ≥65; atypical เด่น ≥75–80 · เลือก 70 เป็น default, frailty อาจดึงลง
- เกณฑ์ "soft เดี่ยวเบา → เหลือง" เป็น calibration ของเรา **ยังไม่ validated** → ต้องให้แพทย์ยืนยัน (เสี่ยง under หากหลวมไป)
- delirium ควรถือเป็น near-hard sign **ข้ามอายุ**ด้วยไหม (วัยกลางคนสับสนเฉียบพลันก็ผิดปกติ — น่าจะใช่)

## ข้อควรระวัง (medical/liability) — เสริมจาก deep-research
- **ลด over-triage มี "ราคา" ที่วัดได้:** พอ symptom checker "ระวังน้อยลง" sensitivity การจับ emergency
  ตกจาก 85.7% → 51.9% (พลาด >40% ของ emergency, JMIR 2022/2023). → **ต้องตัด false alarm เฉพาะอาการธรรมดา
  ที่ไม่มี modifier เท่านั้น อย่าไปลดความไวต่อ red flag จริง.** de-sensitize แบบระมัดระวัง เอียงไป escalate ในผู้สูงอายุ.
- **ระบบต้องออก "เขียว" ได้:** บาง checker ไม่เคยแนะนำ self-care เลย → โครงสร้างผิด. deterministic engine
  ต้องจัดอาการธรรมดาที่ไม่มี modifier เป็น low-urgency ได้จริง (ไม่งั้นก็ alarm fatigue เหมือนเดิม).
- NEWS2 ออกแบบสำหรับการเสื่อมเฉียบพลัน "ในที่ที่มี monitor" — เอามาใช้กับค่าที่ญาติวัดเองที่บ้าน
  เป็นการดัดแปลง: **คงคำเตือน "ปรึกษาแพทย์" เสมอ (rule 3)** และ bias ไปทางระวังไว้ก่อน
- **ค่าที่ขาด (ไม่ได้วัด) อย่าตีความว่าปกติ** — คำนวณเท่าที่มี + บอกชัดว่าข้อมูลไม่ครบ ไม่ใช่ "ปลอดภัย"
- คะแนน = "ความเร่งด่วน/ความควรใส่ใจ" ไม่ใช่ชื่อโรค — ห้ามวินิจฉัย · **LLM ห้ามตัดสิน urgency (rule 2)** — ทำแค่สกัดคำ
- *หมายเหตุความน่าเชื่อ:* ตัวเลข symptom-checker เป็นการเทียบ cross-cohort ต่างแอป/ต่างปี (บอกทิศทาง ไม่ใช่ causal)
  และหลักฐานส่วนใหญ่ใช้ vignette มาตรฐาน ไม่ใช่ free-text ไทยของผู้สูงอายุจริง — external validity ต้องระวัง.

## เหตุผล · ที่มา · แนวคิด · หลักฐานของแต่ละกฎ (design rationale)
ไล่ทีละกฎว่า **ทำไมเลือกแบบนี้** โดยแยกชัด: 🟢 = มีหลักฐานยืนยัน · 🟠 = เป็น calibration ของเราที่ยังต้องแพทย์ review.

### R1 — LLM ห้ามคิดคะแนน urgency, ให้ deterministic code ตัดสิน 🟢
- **แนวคิด/ที่มา:** AGENTS.md rule 2 + งานวิจัยว่า automated symptom→urgency เชื่อถือไม่ได้
- **ทำไม:** ต้อง auditable/reproducible; เลขจาก LLM ทึบ ตรวจสอบไม่ได้ และไม่นิ่ง
- **หลักฐาน:** symptom checker median triage accuracy แค่ **55.8%** (2020) แทบไม่ต่างจาก 59.1% (2015) → JMIR PMC9131144, e43803

### R2 — แบ่ง 3 แถบ เขียว/เหลือง/แดง 🟢
- **แนวคิด/ที่มา:** tiered acuity banding (ESI, Manchester ใช้ 5 ระดับ)
- **ทำไม:** โครงแถบเป็น design pattern ที่พิสูจน์แล้วว่า map กับความเสี่ยงจริง
- **หลักฐาน:** critical-event rate **เพิ่มขึ้นตามระดับ acuity อย่างมีนัยสำคัญ** (ESI-1 >60% → ESI-4/5 <2%) → PMC12751399 (n=1,072)

### R3 — ใช้ NEWS2 เป็น track vitals (นับแต้มจากค่าที่วัด) 🟢
- **แนวคิด/ที่มา:** Early Warning Score ของ RCP — แต้ม 0–3 ต่อ vital
- **ทำไม:** deterministic 100%, ใช้ข้อมูลที่แอปเก็บอยู่แล้ว (BP/ชีพจร/ไข้/SpO2), validated
- **หลักฐาน:** มาตรฐาน RCP; ใช้ได้กับผู้สูงอายุเปราะบาง → PMC7594283

### R4 — "พารามิเตอร์เดี่ยว = 3 → แดงทันที" 🟢
- **แนวคิด/ที่มา:** กติกา escalation ของ NEWS2 เอง (single parameter = 3 → urgent review)
- **ทำไม:** ค่าเดียวผิดปกติมาก (เช่น SpO2 90, ชีพจร 135) = อันตรายจริง แม้คะแนนรวมต่ำ — safety net
- **หลักฐาน:** RCP NEWS2 escalation protocol

### R5 — ขึ้นแดงต้องมี "corroborating danger sign" ร่วม (อาการหลักเดี่ยวไม่แดง) 🟢 ← กฎแกน
- **แนวคิด/ที่มา:** นิยามทางการของ "red flag" = อาการร่วมที่*เพิ่มขึ้นมา* เพื่อคัดแยกโรคร้าย ไม่ใช่อาการที่มาเล่า
- **ทำไม:** นี่คือรากของการแก้ over-triage — "ปวดท้อง" เฉยๆ ไม่ควรแดง; ความล้มเหลวหลักของ checker คือไม่ถาม red flag
- **หลักฐาน:** checker เจอ red flag แค่ **36.9% เทียบหมอ 71.8%** (p<0.001) → PMC12486864

### R6 — โมเดล 2 ปัจจัย / ถ่วง combination มากกว่า single sign 🟢
- **แนวคิด/ที่มา:** อาการเดี่ยวมี diagnostic accuracy ต่ำ, combination แม่นกว่ามาก
- **ทำไม:** ไม่ escalate จากสัญญาณเดี่ยวที่อ่อน; ถ่วง sign ที่ specificity สูง (ความดันตก) มากกว่า
- **หลักฐาน:** ปวดท้อง — sign เดี่ยว (rebound/guarding/RLQ) ไม่ผ่านเกณฑ์ LR; **integrated assessment LR+ 24.6**, hypotension LR+ 7–13 → BJGP Open 2024

### R7 — ตัด over-triage เฉพาะอาการที่ "ไม่มี modifier" + ระบบต้องออกเขียวได้ 🟢
- **แนวคิด/ที่มา:** de-sensitize อย่างระวัง; ระบบที่พูด self-care ไม่ได้ = โครงสร้างพัง
- **ทำไม:** ถ้าตัดกว้างไปจะพลาด, ถ้าไม่ตัดเลยก็ alarm fatigue เหมือนเดิม
- **หลักฐาน:** บาง checker **ไม่เคยแนะนำ self-care เลย**; over-triage เป็น bias จงใจเพราะกลัว liability → JMIR e43803, Frontiers PMC9853165

### R8 — guardrail: ห้ามลดความไวต่อ red flag จริง 🟢
- **แนวคิด/ที่มา:** การลด over-triage มี "ราคา" ด้านความปลอดภัย
- **ทำไม:** ต้องตัด false alarm เฉพาะอาการธรรมดา อย่าไปลดความไวต่อ danger sign
- **หลักฐาน:** พอ checker "ระวังน้อยลง" sensitivity จับ emergency ตก **85.7% → 51.9%** (พลาด >40%) → JMIR PMC9131144
  *(หมายเหตุ: เป็นการเทียบ cross-cohort ต่างแอป บอกทิศทาง ไม่ใช่ causal)*

### R9 — อายุ/frailty = แกนบวกเพิ่มแยก (ไม่ยุบเป็นเลข severity เดียว) 🟢
- **แนวคิด/ที่มา:** ผู้สูงอายุถูก under-triage เป็นระบบ; frailty เสี่ยงตายโดยไม่ขึ้นกับ urgency
- **ทำไม:** ถ้ายุบรวมเป็นเลขเดียวจะกลบสัญญาณอายุ — ต้องเป็น modifier ยกระดับต่างหาก
- **หลักฐาน:** ESI under-triage ผู้สูงอายุ **OR 1.49–2.18** (PMC8730791); frailty 30-day mortality **11.7% vs 3.4% ทุกระดับ triage**, explained variance ของการตายเพิ่ม 1.0%→6.3% เมื่อเสริม geriatric screen → JGS 2020

### R10 — I3: geriatric soft signs = red flag ในผู้สูงอายุ 🟢 (แนวคิด) / 🟠 (threshold)
- **แนวคิด/ที่มา:** atypical presentation — ผู้สูงอายุป่วยหนักมักมาแบบไม่มี classic sign, soft sign *คือ* การนำเสนอ
- **ทำไม:** ถ้ารอ classic sign จะพลาด (ขัดกับ R9); soft sign (สับสน/กินน้อย/ล้ม/ไม่เหมือนเดิม) จึงต้องยกระดับได้
- **หลักฐาน:** **53% atypical**, 15% ไม่มีอาการปกติเลย, ~ครึ่งของ diverticulitis ไม่มีไข้ → NJM, PMC4306086

### R11 — soft เดี่ยว-เบา → เหลือง (ไม่แดง), soft ≥2/เฉียบพลัน/delirium → แดง 🟠 ← calibration ของเรา
- **แนวคิด:** สมดุลระหว่าง R10 (กัน under-triage) กับ R7/R8 (กัน over-triage กลับมา)
- **ทำไม:** soft sign เดี่ยวๆ common มาก ถ้าเด้งแดงหมดคือ alarm fatigue; แต่หลายอย่าง/เฉียบพลัน = หน้าตาป่วยหนักจริง
- **หลักฐาน/สถานะ:** **ยังไม่ validated — เป็น threshold ที่เราตั้งเอง** ต้องให้แพทย์ยืนยัน (เสี่ยง under หากหลวมไป)

### R12 — รวมผลด้วย max(track ทั้งหมด) 🟠
- **แนวคิด:** เอาระดับที่รุนแรงสุด (bias to caution)
- **ทำไม:** ปลอดภัยไว้ก่อน สอดคล้อง guardrail R8; แต่ยังไม่มีหลักฐานตรงว่า max ดีกว่า weighted-sum → เป็นตัวเลือกออกแบบ

### R13 — ค่าที่ไม่ได้วัด ≠ ปกติ 🟢
- **แนวคิด/ที่มา:** ข้อมูลไม่ครบไม่เท่ากับปลอดภัย (partial NEWS2)
- **ทำไม:** ถ้าเติม 0 ให้ค่าที่ขาดจะปลอบใจผิด → คำนวณเท่าที่มี + แจ้งชัดว่าไม่ครบ

### R14 — อาการที่จด: worst-recent แทนค่าเฉลี่ย 7 วัน 🟢 (ทำแล้ว, v2)
- **ปัญหาเดิม:** doctor-score เดิมใช้ **ค่าเฉลี่ย** band ของอาการ 7 วัน (`scoreLevel` + floor ตามข้อแดง) —
  ค่าเฉลี่ยเจือจาง (dilution): จด band-3 หนึ่งครั้งในวันที่มีอาการเบาหลายครั้ง → ค่าเฉลี่ยตกเหลือเหลือง;
  แถม **frequency-bias** (จดถี่ = คะแนนสูงเอง) และไม่มี recency (อาการ 6 วันก่อนถ่วงเท่ากับวันนี้).
- **แก้ (`recentSeverityLevel` ใน `lib/risk.ts`):** เอา **band สูงสุด (max) แบบถ่วงเวลา** ไม่ใช่ค่าเฉลี่ย —
  triage ดูสัญญาณที่แย่ที่สุดที่ยังใหม่ ไม่ใช่ค่าเฉลี่ย:
  - **≤3 วัน** → นับเต็ม (band ตามจริง: sev 0–3→เขียว, 4–7→เหลือง, 8–10→แดง, ไม่ระบุ→เหลือง)
  - **4–7 วัน** → เฉพาะ **ข้อแดง** (band 3) ยังค้าง · เหลือง/เขียวเก่าจางหาย
  - **>7 วัน** → ไม่นับ
- **ผล:** max ทำหน้าที่ floor ในตัว (ข้อแดงเดี่ยว = แดง ไม่ถูกเฉลี่ยกลบ) · ไม่ขึ้นกับจำนวนครั้งที่จด · มี recency.
  ตัวอย่าง `[1,1,1,1,9]` (recent): เดิมเฉลี่ย→เหลือง, ใหม่→**แดง**.
- **สถานะ:** implement + test ใน `lib/risk.ts` / `lib/risk.test.mts`; เสียบแทน `scoreLevel` ใน doctor-score
  ทั้งหน้าแรก + `/signals`. (`scoreLevel` ของ `lib/severity.ts` ยังใช้ให้สีการ์ดรายวันในปฏิทิน — ต่างบริบท)

## แผน implement (ยังไม่ทำ) — โมเดล 2 ปัจจัยตาม deep-research
- **LLM สกัดอย่างเดียว:** แปลง free-text → controlled vocab { อาการ, ความรุนแรง(คำ), ระยะเวลา, danger signs } — ไม่ตัดสิน urgency
- `lib/risk.ts`:
  - `news2Score(vitals) → { total, perParam, band, incomplete }` (deterministic, มี test)
  - `symptomBand(symptom, modifiers) → band` — base จากอาการ, **ขึ้นแดงเฉพาะเมื่อมี ≥1 danger sign ร่วม**
  - `geriatricModifier(age, diseases)` — บวกเพิ่มแยกต่างหาก (อายุ+โรคประจำตัว → ยกระดับ)
- **band สุดท้าย = max(NEWS2, symptom, geriatric-escalated)** → ป้อน doctor-score / สีปฏิทิน/ไทม์ไลน์
- เพิ่มช่องกรอก resp rate + ระดับรู้สึกตัว (optional) เพื่อให้ NEWS2 ครบ

## Open questions (จาก deep-research — ต้องเคลียร์ก่อน ship)
1. **Thai red-flag vocabulary** — map วลีที่ญาติพิมพ์จริง → danger-sign flags; หาแหล่งไทยเสริม (สปสช./ราชวิทยาลัย)
2. **เกณฑ์อายุ/frailty** — age≥70 พอไหม หรือควรมี frailty screener เบาๆ (แบบ APOP) จากญาติ, และให้ยกกี่ระดับ
3. **Base severity scale** — มี scale caregiver/proxy ที่ validated สำหรับผู้สูงอายุ (ESAS Edmonton, PROMIS 0–10)
   มาแทน 0–10 "ความควรใส่ใจ" ที่ ad-hoc อยู่ ให้ reproducible ขึ้นไหม
4. **เกณฑ์ระยะเวลา/ความถี่** — ปวดกี่วัน/แบบไหนถึงยกระดับ (งานวิจัยยืนยันว่า combination สำคัญ แต่ไม่ให้ตัวเลข cutoff ชัด)

## จุดอ่อน & upgrade roadmap (W1–W6)
ทบทวนเชิงวิพากษ์ — เรียงตามความเสี่ยง/ผลกระทบ (🔴 showstopper · 🟠 สำคัญ · 🟡 รอง).

### 🔴 W1 — "ตัวตัดสินจริงคือการสกัดคำของ LLM"
เราย้าย *การตัดสิน* ไป deterministic แล้ว แต่ **อินพุต (มี danger sign ไหน) ยังมาจาก LLM** → LLM สกัดพลาด = under-triage เงียบ.
บนกระดาษทำตาม rule 2 แต่ LLM ยัง gate ความปลอดภัยทางอ้อม.
- **upgrade (a):** deterministic **keyword safety-net ไทย** สำหรับ hard danger sign (เลือด/อาเจียนเป็นเลือด/ถ่ายดำ/หมดสติ/ชัก/เจ็บหน้าอก/หายใจไม่ออก) → **union กับ LLM**
- **upgrade (b) — แรงสุด, ตรงหลักฐาน:** **active red-flag elicitation** — ถามญาติ checklist yes/no ต่ออาการ แทนรอสกัด (แก้ failure #1: checker เจอ red flag 36.9% เพราะ *ไม่ถาม*)
- **upgrade (c):** อินพุตกำกวม/สั้น → default อย่างน้อย watch

### 🔴 W2 — NEWS2 รันไม่ได้จริง (data model ไม่มีค่า)
`WeightLog` เก็บแค่ **kg + ความดัน + ชีพจร** — **ไม่มี ไข้/SpO2/หายใจ/ระดับรู้สึกตัว**; care task "วัดไข้/วัดออกซิเจน" เป็น**แค่ checkbox** → NEWS2 ใช้ได้ 2/7 พารามิเตอร์.
- **upgrade:** เพิ่มฟิลด์ temp/spo2/respRate/consciousness (WeightLog หรือ Vitals model) + care task วัดไข้/ออกซิเจน**กรอกค่า** · ระหว่างนี้ยอมรับว่าเป็น partial NEWS2

### 🟠 W3 — ไม่ใช้ข้อมูลระยะยาว (จุดแข็งที่ทิ้ง)
สูตรมองทีละวัน → การทรุดช้าๆ (น้ำหนักลด, ปวดแย่ลง, soft sign หลายวัน) ไม่เด้งแดงวันใดวันหนึ่ง; อาการเรื้อรังคงที่ = เหลืองค้าง (fatigue).
- **upgrade:** **trend layer** (น้ำหนักลด %/N วัน, soft sign ≥K/M วัน, ความรุนแรงเทรนด์ขึ้น) + **baseline ส่วนตัว** (escalate จากเดลต้าจากปกติของคนนั้น)

### 🟠 W4 — ไม่มีการพิสูจน์ end-to-end / ไม่มี ground truth
มีหลักฐานรายกฎ ✓ แต่ทั้ง pipeline บนเคสไทยจริงยังไม่วัด (external validity มาจาก vignette). threshold ทั้งหมดยังเป็นการเดา.
- **upgrade:** **eval harness** — ชุดเคสเล่าไทย + แพทย์ติดป้าย band → วัด sensitivity/specificity → จูน · + เก็บ outcome feedback ("ไปหาหมอแล้ว/ผลเป็นไง")

### 🟡 W5 — negation ภาษาไทยพัง keyword net
"ไม่มีเลือด"/"กลัวจะมีเลือด" → จับผิด over-triage · **upgrade:** matching รู้ negation หรือ keyword hit → ให้ LLM ยืนยัน (2 ชั้น)

### 🟡 W6 — เกณฑ์ระยะเวลาไม่มี evidence anchor
งานวิจัยบอกตรงๆ ว่าไม่มี lay cutoff · **upgrade:** ทำเป็น soft escalator + ติดป้าย unvalidated หรือ defer

**ลำดับแนะนำ:** W2 (data model — ไม่แก้ NEWS2 เป็น stub) → W1 (keyword net + active elicitation) → W4 (eval harness — พิสูจน์ได้) → W3 (trend/baseline)

## Sources
**NEWS2 (track 1):**
- NEWS2 — Royal College of Physicians: https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/
- NEWS2 scoring & escalation — iatrox: https://www.iatrox.com/blog/news2-scoring-escalation-guide
- NEWS2 & triage in frail older adults — PMC7594283: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7594283/

**Deep-research (triage / red-flag / geriatric — verified):**
- Red flags in online symptom checkers (36.9% vs 71.8%) — PMC12486864: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12486864/
- Signs of serious illness in acute abdominal pain, systematic review (combinations LR+ 24.6) — BJGP Open 2024: https://bjgpopen.org/content/8/3/BJGPO.2023.0245
- Abdominal pain red-flag list (danger signs) — livhospital: https://int.livhospital.com/abdominal-pain-red-flags-the-ultimate-critical-list/ · AAFP: https://www.aafp.org/pubs/afp/issues/2008/0401/p971.html
- Symptom-checker over/under-triage tradeoff — JMIR 2022 (PMC9131144): https://pmc.ncbi.nlm.nih.gov/articles/PMC9131144/ · JMIR 2023 review (e43803): https://www.jmir.org/2023/1/e43803 · Frontiers (PMC9853165): https://pmc.ncbi.nlm.nih.gov/articles/PMC9853165/
- ESI under-triage of elderly (OR 1.49–2.18) — PMC8730791: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8730791/
- Elderly atypical presentation (53%) — NJM: https://njmonline.nl/article_ft.php?a=1870&d=1237&i=207 · geriatric abdominal emergency — PMC4306086: https://pmc.ncbi.nlm.nih.gov/articles/PMC4306086/
- Frailty predicts mortality independent of urgency (APOP) — JGS 2020: https://agsjournals.onlinelibrary.wiley.com/doi/10.1111/jgs.16427
- 5-level acuity validated (Manchester/ESI) — PMC12751399: https://pmc.ncbi.nlm.nih.gov/articles/PMC12751399/

**Per-symptom red flags (Class B grounding — research รอบเบา):**
- ปวดหัว SNNOOP10 — JUCM: https://www.jucm.com/more-than-a-simple-headache-using-the-snnoop10-criteria-to-screen-for-life-threatening-headache-presentations/ · AAFP acute headache 2022: https://www.aafp.org/pubs/afp/issues/2022/0900/acute-headache-adults.html
- ไข้/sepsis ในผู้สูงอายุ (ไข้หายได้ ~30%, confusion นำ) — Ubie silent sepsis seniors: https://ubiehealth.com/doctors-note/silent-sepsis-seniors-over-65-emergency-signals-4721e5
- ถ่ายเหลว/อาเจียน NICE CKS — iatroX: https://www.iatrox.com/guidelines/acute-diarrhoea-adults · patient.info: https://patient.info/doctor/gastroenterology/acute-diarrhoea-in-adults-pro
- หายใจ/dyspnea red flags — Medscape: https://www.medscape.com/viewarticle/primary-cares-crucial-role-dyspnea-identify-red-flags-2025a1000jt3 · StatPearls: https://www.ncbi.nlm.nih.gov/books/NBK499965/
- UTI/urosepsis ในผู้สูงอายุ — PMC5873814: https://pmc.ncbi.nlm.nih.gov/articles/PMC5873814/
- หกล้ม/head injury (anticoagulant→CT) — AAFP falls 2024: https://www.aafp.org/pubs/afp/issues/2024/0500/falls-older-adults.html · Merck: https://www.merckmanuals.com/professional/geriatrics/falls-in-older-adults/falls-in-older-adults
- ขาบวม/DVT Wells — MDCalc: https://www.mdcalc.com/calc/362/wells-criteria-dvt · StatPearls: https://www.statpearls.com/point-of-care/161100

> รายงาน deep-research ฉบับเต็ม (8 findings + votes + caveats): `tasks/wevfu7fv1.output` (session artifact).
