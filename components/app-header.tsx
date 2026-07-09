import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        หมอนำทาง
      </Link>
      <Link href="/urgent" aria-label="เกิดเรื่องแล้ว — ฉุกเฉิน" className="urgent-top">
        ฉุกเฉิน
      </Link>
    </header>
  );
}
