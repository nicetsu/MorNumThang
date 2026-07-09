// ponytail: per-request DB read — never prerender a stale snapshot.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { Directory } from "./directory";

export default async function RightsDirectory() {
  const [rights, services, agencies, facilities] = await Promise.all([
    db.healthRight.findMany(),
    db.service.findMany({ orderBy: { id: "asc" } }),
    db.agency.findMany(),
    db.facility.findMany({ orderBy: { district: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/rights" className="back-link">← สิทธิของม้า</Link>
      <div>
        <p className="eyebrow">คลังข้อมูลสิทธิ</p>
        <h2 className="screen-title">สิทธิและบริการทั้งหมด</h2>
        <p className="lead">ค้นหาสิทธิ บริการ หน่วยงาน และสถานพยาบาล</p>
      </div>
      <Directory rights={rights} services={services} agencies={agencies} facilities={facilities} />
    </div>
  );
}
