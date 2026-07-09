"use client";

import { useCallback, useState } from "react";

type State = "idle" | "loading" | "done" | "error";

// Shared reader for the /api/ai text stream. onChunk gets the accumulated text so
// callers can either display it or pipe it into an editable field.
export function useAiStream(kind: "summary" | "signals" | "care") {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("idle");

  const run = useCallback(
    async (onChunk?: (full: string) => void) => {
      setText("");
      setState("loading");
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        if (!res.ok || !res.body) throw new Error();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setText(full);
          onChunk?.(full);
        }
        setState("done");
      } catch {
        setState("error");
      }
    },
    [kind],
  );

  return { text, state, run };
}
