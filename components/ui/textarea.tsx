import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // ponytail: retuned to the app's large-touch tokens (see globals.css .flow-form textarea) — 90px / 18px / teal focus.
        "flex field-sizing-content min-h-[90px] w-full resize-y rounded-[14px] border border-input bg-white px-4 py-3 text-[18px] leading-relaxed transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-teal focus-visible:ring-4 focus-visible:ring-teal/10 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
