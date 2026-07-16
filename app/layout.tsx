import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/register-sw";
import { LiffDeepLink } from "@/components/liff-deeplink";
import { PID_COOKIE } from "@/lib/patient";

const sarabun = Sarabun({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "หมอนำทาง",
  description: "สมุดสุขภาพสำหรับผู้ดูแล",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "หมอนำทาง" },
  icons: { apple: "/apple-icon-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#1F6E63",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Bottom nav only appears once a ผู้รับการดูแล is chosen — hidden through the enter/select flow.
  const hasPatient = (await cookies()).has(PID_COOKIE);
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* 430px app shell, mirroring the prototype. */}
        <div className="app-shell flex flex-col">
          <AppHeader />
          <main className="flex-1 px-5 py-6">{children}</main>
          {hasPatient && <BottomNav />}
        </div>
        <Toaster />
        <RegisterSW />
        <LiffDeepLink />
      </body>
    </html>
  );
}
