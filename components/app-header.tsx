import Link from "next/link";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <Link href="/" className="text-2xl font-extrabold text-teal">
        หมอนำทาง
      </Link>
      <Link
        href="/urgent"
        aria-label="เกิดเรื่องแล้ว — ฉุกเฉิน"
        className="flex min-h-11 items-center rounded-lg bg-red-soft px-4 font-bold text-red"
      >
        ฉุกเฉิน
      </Link>
    </header>
  );
}
