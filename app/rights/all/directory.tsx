"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// ponytail: client-side substring filter over already-loaded rows. No search infra,
// no pagination — a few dozen rows total.

type Right = { id: string; name: string; eligibleUsers: string; coverageLevel: string; monthlyCost: string };
type Service = { id: string; name: string; category: string };
type Agency = { id: string; name: string; responsibility: string };
type Facility = { id: string; name: string; district: string; type: string };

const TABS = ["สิทธิ", "บริการ", "หน่วยงาน", "สถานพยาบาล"] as const;
type Tab = (typeof TABS)[number];

export function Directory({
  rights,
  services,
  agencies,
  facilities,
}: {
  rights: Right[];
  services: Service[];
  agencies: Agency[];
  facilities: Facility[];
}) {
  const [tab, setTab] = useState<Tab>("สิทธิ");
  const [q, setQ] = useState("");
  const has = (...parts: (string | undefined)[]) =>
    !q.trim() || parts.filter(Boolean).join(" ").toLowerCase().includes(q.trim().toLowerCase());

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหา…"
        aria-label="ค้นหา"
      />

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? "true" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[15px] font-medium ${
              tab === t ? "bg-teal text-white" : "border border-line text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "สิทธิ" && (
        <div className="space-y-2">
          {rights.filter((r) => has(r.name, r.eligibleUsers)).map((r) => (
            <article key={r.id} className="card">
              <strong className="block">{r.name}</strong>
              <small className="text-muted-foreground">ใครใช้ได้: {r.eligibleUsers}</small>
              <small className="block text-muted-foreground">
                ความคุ้มครอง: {r.coverageLevel} · ค่าใช้จ่าย: {r.monthlyCost === "0" ? "ไม่มี" : r.monthlyCost}
              </small>
            </article>
          ))}
        </div>
      )}

      {tab === "บริการ" && (
        <div className="space-y-2">
          {services.filter((s) => has(s.name, s.category)).map((s) => (
            <article key={s.id} className="list-card">
              <span className="pill-icon">•</span>
              <div>
                <strong>{s.name}</strong>
                <small>{s.category}</small>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "หน่วยงาน" && (
        <div className="space-y-2">
          {agencies.filter((a) => has(a.name, a.responsibility)).map((a) => (
            <article key={a.id} className="list-card">
              <span className="pill-icon">{a.name.trim().charAt(0)}</span>
              <div>
                <strong>{a.name}</strong>
                <small>{a.responsibility}</small>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "สถานพยาบาล" && (
        <div className="space-y-2">
          {facilities.filter((f) => has(f.name, f.district)).map((f) => (
            <article key={f.id} className="list-card">
              <span className="pill-icon">รพ.</span>
              <div>
                <strong>{f.name}</strong>
                <small>{f.district || f.type}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
