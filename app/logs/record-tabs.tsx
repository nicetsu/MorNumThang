"use client";

import { useState } from "react";
import { NarrativeRecord } from "./narrative-record";

// weightForm is server-rendered and passed in as a child (keeps its Server Action intact).
export function RecordTabs({ weightForm }: { weightForm: React.ReactNode }) {
  const [tab, setTab] = useState<"aeh" | "weight">("aeh");

  return (
    <div className="space-y-5">
      <div className="seg-tabs cols-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "aeh"} onClick={() => setTab("aeh")}>
          เล่าอาการ
        </button>
        <button type="button" role="tab" aria-selected={tab === "weight"} onClick={() => setTab("weight")}>
          จดค่าร่างกาย
        </button>
      </div>
      {tab === "aeh" ? <NarrativeRecord /> : weightForm}
    </div>
  );
}
