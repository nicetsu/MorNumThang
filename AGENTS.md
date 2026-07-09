# AGENTS.md — หมอนำทาง (Mor Num Thang)

Guidance for AI coding agents working in this repo. See `PLAN.md` for the full build plan.

## What this is
A Thai elderly-care companion app. A caregiver ("ลูก") tracks a parent's ("ม้า") health: weight, meds,
allergies, appointments, doctor-visit notes, and generates a doctor-ready summary. UI is **Thai**, designed
for large touch targets and low-literacy users. Reference prototype: `mornumthang2/uploads/`.

## Stack
- Next.js App Router + TypeScript, Server Actions for mutations (no separate API layer).
- Tailwind + shadcn/ui. Add components with `npx shadcn@latest add <name>` — only when needed.
- Prisma + SQLite (dev). Swap datasource to Postgres for prod; do not change queries.
- AI: **gemma-med 1.5** over an OpenAI-compatible endpoint, via the `ai` SDK, **server-side only**.

## Golden rules
1. **Server-side AI only.** Model endpoint/key live in env (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`).
   Never call the model or expose keys from client components.
2. **The LLM never gates medical safety.** Allergy/medication conflict checks are deterministic code.
   The model summarizes and organizes; it does not diagnose or prescribe.
3. **Always show the medical disclaimer** on any AI-generated output ("ปรึกษาแพทย์…").
4. **Thai UI strings.** Match the prototype's tone (gentle, reassuring). No i18n framework yet.
5. **Be lazy (ponytail).** Stdlib/native > dependency. No auth, multi-patient, PWA, or i18n until real.
   Shortest working diff. Mark deliberate shortcuts with a `// ponytail:` comment.

## Layout (target)
```
app/            routes/screens + Server Actions; app/api/ai/route.ts for streaming AI
components/      shadcn ui/ + app components
lib/            ai.ts (gemma-med client), db.ts (prisma), allergy.ts (deterministic checks)
prisma/         schema.prisma, migrations, seed.ts
```

## Commands
```bash
npm run dev                 # dev server
npx prisma migrate dev      # apply schema changes
npx prisma studio           # inspect data
npx shadcn@latest add X     # add a UI component
```

## Definition of done (per slice)
Persists across reload · deterministic safety checks covered by one runnable test · AI output carries a
disclaimer · no secrets in client bundle · matches the prototype's Thai copy and gentle tone.
