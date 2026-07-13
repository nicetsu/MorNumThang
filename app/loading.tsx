// ponytail: one root Suspense boundary → every dynamic route swaps screens
// instantly and shows this while the server renders, instead of freezing.
export default function Loading() {
  return (
    <div className="grid place-items-center py-20 text-muted-foreground" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-teal" aria-hidden />
      <span className="mt-3 text-sm">กำลังโหลด…</span>
    </div>
  );
}
