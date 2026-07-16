"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, MicOff } from "lucide-react";
import { organizeNarrativeAction, saveObservations } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISCLAIMER } from "@/lib/disclaimer";

// signs carried through from the AI extraction (not edited in review) → saved for the risk engine.
type Item = { category: string; text: string; severity: number; signs: string[] };

// Dot color by AI severity: 0-3 เขียว, 4-7 เหลือง, 8-10 แดง.
function sevColor(s: number): string {
  return s >= 8 ? "bg-red" : s >= 4 ? "bg-amber" : "bg-teal";
}

const CHIPS = [
  { label: "กินน้อยลง", value: "ช่วงนี้แม่กินน้อยลง" },
  { label: "เดินไม่เหมือนเดิม", value: "ช่วงนี้แม่เดินไม่เหมือนเดิม" },
  { label: "นอนเปลี่ยนไป", value: "ช่วงนี้การนอนของแม่เปลี่ยนไป" },
  { label: "วันนี้มีเรื่องดี", value: "วันนี้แม่กินหมดจาน เป็นเรื่องดี" },
];

export function NarrativeRecord() {
  const router = useRouter();
  const [story, setStory] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [organizing, startOrganize] = useTransition();
  const [saving, startSave] = useTransition();

  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<"th-TH" | "en-US">("th-TH");
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition =
        typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (!SpeechRecognition) {
        toast.error("เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง (Speech Recognition)");
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = speechLang;

      rec.onstart = () => {
        setIsListening(true);
        toast.success(
          speechLang === "th-TH"
            ? "เริ่มบันทึกเสียงภาษาไทยแล้วค่ะ พูดได้เลย"
            : "Started English voice recording. Speak now."
        );
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          toast.error("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตสิทธิ์การใช้งานไมโครโฟนในเบราว์เซอร์");
        } else {
          toast.error(`เกิดข้อผิดพลาดในการบันทึกเสียง: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript;
        setStory((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognitionRef.current = rec;
      rec.start();
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  function organize() {
    if (!story.trim()) return;
    startOrganize(async () => {
      const result = await organizeNarrativeAction(story);
      if (result.length === 0) {
        toast.error("จัดหมวดไม่สำเร็จ ลองใหม่อีกครั้งนะคะ");
        return;
      }
      setItems(result);
    });
  }

  function save() {
    if (!items) return;
    startSave(async () => {
      await saveObservations(items);
      toast.success("เก็บลงสมุดแล้วค่ะ");
      setStory("");
      setItems(null);
      // Jump to the log timeline so the caregiver sees what they just recorded.
      router.push("/signals");
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <p className="text-muted-foreground">
        พูดหรือพิมพ์สั้น ๆ ได้เลย เดี๋ยว AI ช่วยจัดเข้าหมวดให้
      </p>

      <div className="relative">
        <Textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={4}
          placeholder="เช่น ช่วงนี้แม่กินน้อยลง ดื่มน้ำน้อย แล้วก็ตื่นเข้าห้องน้ำบ่อย"
          className="bg-ivory w-full"
        />

        {/* Voice control bar */}
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-ivory p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                isListening
                  ? "bg-red text-white"
                  : "bg-teal-soft text-teal hover:bg-teal/10"
              }`}
              title={isListening ? "หยุดบันทึกเสียง" : "พิมพ์ด้วยเสียง"}
              aria-label={isListening ? "หยุดบันทึกเสียง" : "พิมพ์ด้วยเสียง"}
            >
              {isListening ? (
                <MicOff className="h-5 w-5 animate-pulse" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-bold text-muted-foreground">
              {isListening
                ? speechLang === "th-TH"
                  ? "กำลังฟังภาษาไทย..."
                  : "Listening in English..."
                : speechLang === "th-TH"
                ? "แตะไมค์เพื่อพูดภาษาไทย"
                : "Tap mic to speak English"}
            </span>
          </div>

          <div className="seg-tabs cols-2 w-auto max-w-[150px] !p-0.5 !rounded-lg text-xs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={speechLang === "th-TH"}
              disabled={isListening}
              onClick={() => setSpeechLang("th-TH")}
              className="!min-h-8 !text-xs !rounded-md px-3 py-1.5 font-bold disabled:opacity-50"
            >
              ไทย
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={speechLang === "en-US"}
              disabled={isListening}
              onClick={() => setSpeechLang("en-US")}
              className="!min-h-8 !text-xs !rounded-md px-3 py-1.5 font-bold disabled:opacity-50"
            >
              EN
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setStory((s) => (s ? `${s} ${c.value}` : c.value))}
            className="min-h-10 rounded-full bg-teal-soft px-3 font-bold text-teal"
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={organize}
        disabled={organizing || !story.trim()}
        className="btn-primary"
      >
        {organizing ? "กำลังจัดหมวด…" : "ช่วยจัดลงสมุด"}
      </button>

      {items && (
        <div className="space-y-3 rounded-xl bg-ivory p-4">
          <strong className="block text-teal">ตรวจก่อนบันทึก — แก้ไขได้เลยค่ะ</strong>
          {items.map((it, i) => (
            <div key={i} className="space-y-1 rounded-xl border border-line bg-card p-3">
              <div className="flex items-center gap-2">
                <span className={`size-3 shrink-0 rounded-full ${sevColor(it.severity)}`} title={`ความควรใส่ใจ ${it.severity}/10`} aria-hidden />
                <Input
                  value={it.category}
                  onChange={(e) =>
                    setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))
                  }
                  className="min-h-0 rounded-lg bg-ivory px-3 py-1.5 text-sm font-bold"
                />
              </div>
              <Textarea
                value={it.text}
                onChange={(e) =>
                  setItems((arr) => arr!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                }
                rows={2}
                className="min-h-0 rounded-lg bg-ivory px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setItems((arr) => arr!.filter((_, j) => j !== i))}
                className="text-sm font-bold text-clay"
              >
                ลบข้อนี้
              </button>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">{AI_DISCLAIMER}</p>
          <button
            type="button"
            onClick={save}
            disabled={saving || items.length === 0}
            className="btn-primary"
          >
            {saving ? "กำลังบันทึก…" : "ถูกต้อง บันทึกลงสมุด"}
          </button>
        </div>
      )}
    </div>
  );
}
