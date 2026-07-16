// ponytail: per-request read — the patient list can change (create/select).
export const dynamic = "force-dynamic";

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { PID_COOKIE, ensureSelfPatient, getUserId } from "@/lib/patient";
import { RoleChooser } from "./role-chooser";
import { CareFlow } from "./care-flow";
import { SelfFlow } from "./self-flow";

type Role = "care" | "self";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const uid = (await getUserId())!;
  const raw = (await searchParams).role;
  const role: Role | null = raw === "care" || raw === "self" ? raw : null;

  const [user, patients, activeId] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: uid } }),
    db.patient.findMany({
      where: { caregivers: { some: { id: uid } } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        age: true,
        coverage: true,
        selfOfUserId: true,
        inviteCode: true,
      },
    }),
    cookies().then((c) => c.get(PID_COOKIE)?.value),
  ]);

  const selfRow = patients.find((p) => p.selfOfUserId === uid) ?? null;
  const others = patients.filter((p) => p.selfOfUserId !== uid);

  // ── Chooser: pick caregiver vs care-recipient before diving in ──
  if (!role) {
    let helperCount = 0;
    if (selfRow) {
      helperCount = await db.user.count({
        where: { patients: { some: { id: selfRow.id } }, id: { not: uid } },
      });
    }
    return (
      <RoleChooser
        displayName={user.name ?? user.lineId}
        careCount={others.length}
        helperCount={helperCount}
      />
    );
  }

  // ── Caregiver flow ──
  if (role === "care") {
    return <CareFlow others={others} activeId={activeId} />;
  }

  // ── Self / invite flow — create self Patient only when entering this path ──
  const me = selfRow ?? (await ensureSelfPatient(uid));
  const helpers = await db.patient.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      caregivers: {
        where: { id: { not: uid } },
        select: { id: true, name: true, lineId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const inviteUrl = `${base}/join/${me.inviteCode}`;
  const inviteText = `ช่วยกันดูแล${me.name}ในหมอนำทางนะคะ\n${inviteUrl}`;

  return (
    <SelfFlow
      meName={me.name}
      accountLabel={user.name ?? user.lineId}
      inviteText={inviteText}
      helpers={helpers.caregivers}
      meActive={activeId === me.id}
    />
  );
}
