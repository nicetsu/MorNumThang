import assert from "node:assert";
import { stripDenyRightsLines } from "./ai.ts";

// Feed a string through the transform (chunked oddly to prove line-buffering across chunk boundaries).
async function run(chunks: string[]): Promise<string> {
  const src = new ReadableStream<string>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  });
  let out = "";
  const reader = stripDenyRightsLines(src).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

// drops the "no สิทธิ data" denial line the model slips in, keeps everything else
{
  const out = await run([
    "- ยาที่ใช้: amlodipine\n",
    "> ไม่มีข้อมูลสิทธิหรือบริการการรักษาในระบบตรวจสอบ\n",
    "- น้ำหนัก: 58 กก.\n",
  ]);
  assert.ok(!out.includes("ไม่มีข้อมูลสิทธิ"), "denial line should be gone");
  assert.ok(out.includes("amlodipine") && out.includes("58 กก."), "real lines kept");
}

// denial line split across chunk boundaries is still caught
{
  const out = await run(["> ยังไม่ได้รับข้อมูล", "สิทธิการรักษา\n", "จบ\n"]);
  assert.ok(!out.includes("สิทธิ"), "split denial line caught");
  assert.ok(out.includes("จบ"));
}

// legit rights lines (no ไม่มี/ยังไม่) are NOT stripped
{
  const out = await run(["สิทธิการรักษา: บัตรทอง\n", "บริการที่มีสิทธิ: ตรวจสุขภาพฟรี\n"]);
  assert.ok(out.includes("บัตรทอง") && out.includes("ตรวจสุขภาพฟรี"), "provided rights preserved");
}

// trailing denial line with no final newline is still dropped (flush path)
{
  const out = await run(["- ยา: amlodipine\n", "ไม่มีข้อมูลสิทธิ"]);
  assert.equal(out, "- ยา: amlodipine\n");
}

console.log("ai.test.mts ✓");
