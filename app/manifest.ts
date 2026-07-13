import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "หมอนำทาง — สมุดสุขภาพสำหรับผู้ดูแล",
    short_name: "หมอนำทาง",
    description: "สมุดสุขภาพสำหรับผู้ดูแล — น้ำหนัก ยา นัดหมอ และสรุปให้หมอ",
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6EF",
    theme_color: "#1F6E63",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
