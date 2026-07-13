import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: lets a phone on the same Wi-Fi load dev assets/HMR from the PC's LAN IP —
  // Next.js 16 blocks cross-origin dev-server requests by default (buttons render but don't
  // respond otherwise, since client JS never hydrates). Update the IP if DHCP reassigns it
  // (check with `ipconfig` / Get-NetIPAddress).
  allowedDevOrigins: ["10.206.37.98"],
};

export default nextConfig;
