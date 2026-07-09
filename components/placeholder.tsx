import Link from "next/link";

// ponytail: shared empty-state screen for Slice 1. Each becomes a real screen in its own slice.
export function Placeholder({
  back,
  eyebrow,
  title,
  children,
}: {
  back: { href: string; label: string };
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 py-2">
      <Link href={back.href} className="inline-block font-bold text-teal">
        {back.label}
      </Link>
      {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
      <h2 className="text-2xl font-extrabold text-teal">{title}</h2>
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">
        {children ?? "ยังไม่มีข้อมูล"}
      </p>
    </div>
  );
}
