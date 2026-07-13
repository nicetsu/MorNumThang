"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PID_COOKIE, getUserId } from "@/lib/patient";

// The logged-in ผู้ดูแล accepts an invite: connect them to the ผู้รับการดูแล and make it active.
export async function joinAsCaregiver(code: string) {
  const uid = await getUserId();
  if (!uid) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  const patient = await db.patient.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!patient) throw new Error("ลิงก์เชิญไม่ถูกต้อง");
  // connect is idempotent — re-joining does nothing harmful.
  await db.patient.update({ where: { id: patient.id }, data: { caregivers: { connect: { id: uid } } } });
  (await cookies()).set(PID_COOKIE, patient.id, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  redirect("/");
}
