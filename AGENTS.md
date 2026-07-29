# AGENTS.md — หมอนำทาง (Mor Num Thang)

Guidance for AI coding agents working in this repo. See `PLAN.md` for the full build plan.

## What this is
A Thai elderly-care companion app. A caregiver ("ลูก") tracks a parent's ("ม้า") health: weight, meds,
allergies, appointments, doctor-visit notes, and generates a doctor-ready summary. UI is **Thai**, designed
for large touch targets and low-literacy users. Reference prototype: `mornumthang2/uploads/`.

## Stack
- Next.js App Router + TypeScript, Server Actions for mutations (no separate API layer).
- Tailwind + shadcn/ui. Add components with `npx shadcn@latest add <name>` — only when needed.
- Prisma + **PostgreSQL** (Supabase; one DB for dev and prod). Migrate with `migrate dev --create-only`
  then `migrate deploy` so the shared DB isn't reseeded. Generated client: `app/generated/prisma/`.
- AI over OpenAI-compatible endpoints, **server-side only**, in two lanes (`PRESETS` in `lib/ai.ts`, thinking
  disabled on both): **TEXT** = `thaillm`/`typhoon-s-thaillm-8b-instruct` for Thai summaries/organizing,
  **VISION** = `zai`/`glm-4.5v` for drug-label and appointment-slip photo scans. Four presets exist
  (`thaillm`, `zai`, `gemini`, `nvidia`); provider/model/key are all env-overridable. Only the TEXT lane
  currently has a funded key — photo scanning is offline (`docs/deployment.md`).
- Deployed on **Vercel** (`nicetsu/BDI_BKK` → https://bdi-bkk.vercel.app) with Supabase Postgres.

## Golden rules
1. **Server-side AI only.** Model endpoint/key live in env (`AI_BASE_URL`, `NVIDIA_API_KEY`, `AI_MODEL`).
   Never call the model or expose keys from client components.
2. **The LLM never gates medical safety.** Allergy/medication conflict checks are deterministic code.
   The model summarizes and organizes; it does not diagnose or prescribe.
3. **Always show the medical disclaimer** on any AI-generated output ("ปรึกษาแพทย์…").
4. **Thai UI strings.** Match the prototype's tone (gentle, reassuring). No i18n framework yet.
5. **Be lazy (ponytail).** Stdlib/native > dependency. No auth, multi-patient, PWA, or i18n until real.
   Shortest working diff. Mark deliberate shortcuts with a `// ponytail:` comment.
6. **Reuse what's already here before building new.** For a searchable select/dropdown use the existing
   `components/combobox.tsx` (`Combobox`, via the `ComboField` form wrapper) — **not** a raw `<input list>`
   / native `<datalist>` or a hand-rolled control. For option data, pull from the seeded reference tables
   (`HealthRight` = สิทธิ์, `Facility` = สถานพยาบาล, `Service`, `RecommendationRule`) instead of hardcoding
   lists in the component. Grep `components/` and `prisma/schema.prisma` before you invent either.

## Layout
```
app/            routes/screens + Server Actions; api/ai (streaming), api/{meds,appointments}/scan (vision),
                api/auth/line, api/cron/reminders
components/     shadcn ui/ + app components
lib/            ai.ts (text + vision client), db.ts (prisma), patient.ts (cookie scoping), line.ts,
                + deterministic decision modules: allergy · risk · severity · rights · free-meds · infer
prisma/         schema.prisma, migrations, seed.ts, rights-data.json
```

## Commands
```bash
npm run dev                              # dev server
npx prisma migrate dev --create-only     # author a migration (shared DB — never reset it)
npx prisma migrate deploy                # apply it
npx prisma db seed                       # idempotent seed
npx prisma studio                        # inspect data
npx shadcn@latest add X                  # add a UI component

node --experimental-strip-types lib/risk.test.mts   # tests: node:assert files, no runner, no `npm test`
```

## Mistakes ledger — READ AND MAINTAIN
`MISTAKES.md` is a running, newest-first log of mistakes made in this repo (wrong assumptions, bugs
shipped, time wasted on bad theories). **Read it before starting work**, and **append a new entry every
time you catch yourself making a mistake** — date, what went wrong, why, the lesson. This is a standing
rule, not a one-off.

## Definition of done (per slice)
Persists across reload · deterministic safety checks covered by one runnable test · AI output carries a
disclaimer · no secrets in client bundle · matches the prototype's Thai copy and gentle tone.
