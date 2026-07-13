"use client";

import { useFormStatus } from "react-dom";

// Submit button that reflects the form's server-action pending state, so a tap gives
// instant feedback (disable + dim, optional label swap) instead of looking frozen while
// the action round-trips. Must render inside the <form> it belongs to.
export function SubmitButton({
  children,
  pendingText,
  className = "",
  ...rest
}: React.ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...rest}
      disabled={pending || rest.disabled}
      aria-busy={pending}
      className={`${className} ${pending ? "pointer-events-none opacity-60" : ""}`.trim()}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
